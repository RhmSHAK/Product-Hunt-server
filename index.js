const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 2500;

//middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-jajctcs-shard-00-00.cmkpjft.mongodb.net:27017,ac-jajctcs-shard-00-01.cmkpjft.mongodb.net:27017,ac-jajctcs-shard-00-02.cmkpjft.mongodb.net:27017/?ssl=true&replicaSet=atlas-g9xula-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const featuredCollection = client.db("productDB").collection("featuredProduct");
    const userCollection = client.db("productDB").collection("user");
    const reviewCollection = client.db("productDB").collection("review");
    const paymentCollection = client.db("productDB").collection("payment");


    //Review-------------------------------------
    app.post('/review', async(req, res)=>{
      const item = req.body;
      const result = await reviewCollection.insertOne(item);
      res.send(result);
     })

     app.get('/review', async(req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result);
  })
     app.get('/review/:id', async(req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result);
  })




    //jwt related api-------------------------------------
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      //console.log(token);
      res.send({token});
    })

    //middleware
    const verifyToken = (req, res, next) =>{
      console.log('inside verify token', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbidden access'});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'forbidden access'});
        }
        req.decoded = decoded;
        next();
      })
    }

    //use verify admin after verifyToken
    const verifyAdmin = async(req,res,next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.Make_Admin === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }






    //user------------------------------------
    app.post('/user', async(req, res) =>{
      const user = req.body;
      //insert email if user doesn't exists:
      //you can do this many ways (1.email unique, 2.upsert, 3.simple checking)
      const query = {email: user.email} ;
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists', insertedId: null});
      }
      const result= await userCollection.insertOne(user);
      res.send(result);
    })

    //get
    app.get('/user',verifyToken, async(req,res)=>{
       console.log(req.headers);
       const result = await userCollection.find().toArray();
       res.send(result);
   })

   //admin get
   app.get('/user/admin/:email',verifyToken, async(req, res) =>{
    const email= req.params.email;
    if(email !== req.decoded.email){
      return res.status(403).send({message: 'unauthorized access'})
    }
    const query = {email: email}
    const user = await userCollection.findOne(query);
    let admin = false ;
    if(user){
      admin= user?.Make_Admin== 'admin'
    }
   res.send({admin});

  })

  //moderator get
  app.get('/user/moderator/:email',verifyToken, async(req, res) =>{
    const email= req.params.email;
    if(email !== req.decoded.email){
      return res.status(403).send({message: 'unauthorized access'})
    }
    const query = {email: email}
    const user = await userCollection.findOne(query);
    let moderator = false ;
    if(user){
      moderator= user?.Make_Moderator== 'moderator'
    }
   res.send({moderator});

  })


   //admin
   app.patch('/user/admin/:id',verifyToken,verifyAdmin, async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updatedDoc = {
      $set: {
               Make_Admin: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })


  //moderator
  app.patch('/user/moderator/:id',verifyToken, async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updatedDoc = {
      $set: {
               Make_Moderator: 'moderator'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })






    //featured---------------------------------------
    app.get('/featured', async(req,res)=>{
        const result = ((await featuredCollection.find().toArray()));
        res.send(result);
    })

    //sorting-----
    app.get('/featureds/sort', async(req,res)=>{
      const query = {
        product_status: "Accepted" 
      };
        const result = await featuredCollection.find(query).sort({ Vote: -1 }).limit(6).toArray();
        res.send(result);
    })

    app.get('/featureds', async(req,res)=>{
      const query = {
        product_status: "Accepted" 
      };
        const result = ((await featuredCollection.find(query).toArray()));
        res.send(result);
    })

    app.get('/report', async(req,res)=>{
      const query = {
        report_status: 'Report'
       };
        const result = ((await featuredCollection.find(query).toArray()));
        res.send(result);
    })

    app.get('/featured/:id', async(req, res)=>{
      const id = req.params.id;
      //console.log(id);
      const query = {_id: new ObjectId(id)};
      //console.log(query);
      const result = await featuredCollection.findOne(query);
      res.send(result);
    })

    app.post('/featured', async(req, res)=>{
        const item = req.body;
        const result = await featuredCollection.insertOne(item);
        res.send(result);
       })

       //delete
       app.delete('/featured/:id', async(req, res)=>{
        const id = req.params.id;
        //console.log(id);
        const query = {_id: new ObjectId(id)};
        //console.log(query);
        const result = await featuredCollection.deleteOne(query);
        res.send(result);
      })

       //delete
       app.delete('/featured/report/:id', async(req, res)=>{
        const id = req.params.id;
        //console.log(id);
        const query = {_id: new ObjectId(id)};
        //console.log(query);
        const result = await featuredCollection.deleteOne(query);
        res.send(result);
      })

      //update
      app.patch('/featured/:id', async(req,res)=>{
        const item = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
                name: item.name,
                Owner_name: item.Owner_name,
                Owner_image: item.Owner_image,
                Owner_email: item.Owner_email,
                description: item.description,
                image: item.image,
          }
        }
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })

      //products voteUpdate
      app.patch('/featureds/voteProducts/:id', async(req,res)=>{
        const item = req.body;
        //console.log(item);
        const Vote= item.UpVote;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          
          $set: {
             
             email: item.email,
             
            //  UpVote: {...item.UpVote},
            
          },
          $inc: { Vote: 1 } ,
          
        }
        //console.log(UpVote);
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })



      //Feature voteUpdate
      app.patch('/featured/voteSort/:id', async(req,res)=>{
        const item = req.body;
        //console.log(item);
        const Vote= item.UpVote;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          
          $set: {
             
             email: item.email,
             
            //  UpVote: {...item.UpVote},
            
          },
          $inc: { Vote: 1 } ,
          
        }
        //console.log(UpVote);
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })





      //Feature voteUpdate
      app.patch('/featured/voteFeature/:id', async(req,res)=>{
        const item = req.body;
        //console.log(item);
        const Vote= item.UpVote;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          
          $set: {
             
             email: item.email,
             
            //  UpVote: {...item.UpVote},
            
          },
          $inc: { Vote: 1 } ,
          
        }
        //console.log(UpVote);
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })



      //Details voteUpdate
      app.patch('/featured/vote/:id', async(req,res)=>{
        const item = req.body;
        //console.log(item);
        const Vote= item.UpVote;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $inc: { Vote: 1 } ,
          $set: {
             
             email: item.email,
             
            //  UpVote: {...item.UpVote},
            
          },
          
        }
        //console.log(UpVote);
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })


      //accept------------------------------------------------
      app.patch('/featured/accept/:id', async(req,res)=>{
        const item = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            product_status: 'Accepted'
          }
        }
        const result = await featuredCollection.updateOne(filter, updatedDoc,{upsert: true});
        res.send(result);
      })

      //reject----------------------------------------------
      app.patch('/featured/reject/:id', async(req,res)=>{
        const item = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            product_status: 'Rejected'
          }
        }
        const result = await featuredCollection.updateOne(filter, updatedDoc, {upsert: true});
        res.send(result);
      })

      //report----------------------------------------------
      app.patch('/featured/report/:id', async(req,res)=>{
        const item = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            report_status: 'Report'
          }
        }
        const result = await featuredCollection.updateOne(filter, updatedDoc, {upsert: true});
        res.send(result);
      })

      //payment intent
      app.post('/create-payment-intent', async(req,res)=>{
        const {price} = req.body;
        const amount = parseInt(price * 100);
        console.log(amount, 'amount inside the intent');

        const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: 'usd',
              payment_method_types: ['card']
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        })

      })

     //payment api
        app.post('/payment', async(req,res)=>{
          const payment = req.body;
          const paymentResult = await paymentCollection.insertOne(payment);

          
          //
          console.log('payment info',payment);
          
         

          res.send(paymentResult);
          // res.send({paymentResult,update});
        })

        app.get('/payment', async(req,res)=>{
            //const query = {email: req.params.email}
          const result= await paymentCollection.find().toArray();
          res.send(result);
        })




    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('Server is running')
})

app.listen(port, ()=>{
    console.log(`Server is running on PORT: ${port}`);
})