
require("dotenv").config();
const express = require("express");
// const app = express("cors");
const cors = require("cors");

const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();
// middleware
const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH']
  }
  app.use(cors(corsConfig))
app.use(express.json());

const verifyJWT = (req,res,next) =>{
        const authorization = req.headers.authorization;
        if(!authorization){
          return res.status(401).send({error:true, message:'unauthorized access'});

        }

        const token = authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if(err){
            return res.status(401).send({error:true, message:'unauthorized access'});                                       
            }
            req.decoded = decoded;
            next();
          })
}

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iwfbnfv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection= client.db("musicDb").collection("users");
    const popularClassCollection= client.db("musicDb").collection("popularClass");
    const popularInstructorCollection= client.db("musicDb").collection("popularInstructor");
    const cartCollection= client.db("musicDb").collection("carts");
  

    app.post('/jwt',async(req,res) =>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' } ) 
       
        res.send({ token })
    })

    const verifyAdmin = async(req,res,next) => {
            const email =  req.decoded.email;
            const query = {email:email}
            const user = await usersCollection.findOne(query);
            if(user.role !== 'admin'){  
                return res.status(403).send({error :true , message:'forbidden message'});


            }
            next();

    }



      // user api

    app.get('/users', verifyJWT,verifyAdmin, async(req,res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })


      app.post ('/users',async(req,res) =>{
         const user = req.body;
         console.log(user);
         const query = {email:user.email}
         const existingUser = await usersCollection.findOne(query);
         
         console.log( 'existing User' ,existingUser);
         if(existingUser){
           return res.send({message:'user already exist'})
         }
         const result = await usersCollection.insertOne(user);
        res.send(result);


      })



    app.get('/popularClass',async(req,res) =>{
      const result = await popularClassCollection.find().toArray();
      res.send(result);
    })
      app.post('/popularClass' ,verifyJWT,verifyAdmin, async(req, res) => {
 
        const newClass = req.body;
        const result = await popularClassCollection.insertOne(newClass);
        res.send(result);
      })


    app.get('/popularInstructor',async(req,res) =>{
      const result = await popularInstructorCollection.find().toArray();
      res.send(result);
    })

    // cart Collection
    app.get('/carts' ,verifyJWT ,async(req,res) => {
        const email = req.query.email;
        if(!email){
          res.send([]);
        }

          const decodedEmail = req.decoded.email;
          if(email != decodedEmail){
            return res.status(403).send({error :true, message :'forbidden access'})
            
          }


        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
    })
    app.post('/carts',async(req,res) =>{
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);

    })


    // security layout



    app.patch('/users/instructor/:id', async(req,res) =>{
      const id = req.params.id;
      console.log(id);
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
         role: 'instructor'
        },
      };
 
        const result = await usersCollection.updateOne(filter,updateDoc);

        res.send(result);
    })






      app.get('/users/admin/:email', verifyJWT ,async(req,res) =>{

        const email = req.params.email;
          if(req.decoded.email !== email){
            res.send({admin:false})
          }


         const query  = {email:email}
         const user = await usersCollection.findOne(query);
         const result = {admin:user?.role === 'admin'}
         res.send(result);
      })



    app.patch('/users/admin/:id', async(req,res) =>{
      const id = req.params.id;
      console.log(id);
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
         role: 'admin'
        },
      };
 
        const result = await usersCollection.updateOne(filter,updateDoc);

        res.send(result);
    })

    

    app.patch('/popularClass/:id', async (req, res) => {
  const id = req.params.id
  const update_Approval_Pending_Class = req.body;
  const filter = { _id: new ObjectId(id) };                                             // Approve..
  // const options = { upsert: true };
  const update_Approval_Pending_Class_Doc = {
    $set: {
      status: update_Approval_Pending_Class.status,
    },
  };

  const result = await popularClassCollection.updateOne(filter, update_Approval_Pending_Class_Doc);
  res.send(result)

})

    app.patch('/popularClass/:id', async (req, res) => {
  const id = req.params.id
  const update_Approval_Deny_Class = req.body;
  const filter = { _id: new ObjectId(id) };                                             // Approve..
  // const options = { upsert: true };
  const update_Approval_Deny_Class_Doc = {
    $set: {
      status: update_Approval_Deny_Class.status,
    },
  };

  const result = await popularClassCollection.updateOne(filter, update_Approval_Deny_Class_Doc);
  res.send(result)

})








    app.delete('/carts/:id',async(req ,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);

    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Music is going on");
});

app.listen(port, () => {
  console.log(`Ascension Music is going on port ${port}`);
});
