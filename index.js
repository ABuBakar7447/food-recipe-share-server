const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization)

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }

    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekuronr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    const userCollection = client
      .db("foodRecipeShare")
      .collection("userCollection");

    const recipeCollection = client
      .db("foodRecipeShare")
      .collection("recipeCollection");
    // const categoryCollection =  client.db("zooLand").collection("categoryCollection");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      //   console.log("user:", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //user data save
    app.post("/user", async (req, res) => {
      const user = req.body;
      //   console.log(user);
      const query = { email: user.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exist" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // recipe data store in database
    //menu Item storing
    app.post("/recipeItems", verifyJWT, async (req, res) => {
      const newItem = req.body;
      //   console.log(newItem);
      const result = await recipeCollection.insertOne(newItem);
      res.send(result);
    });

    // get all menu api data
    app.get("/allrecipe", async (req, res) => {
      const result = await recipeCollection.find().toArray();
      res.send(result);
    });

    //get selected recipe details
    app.get("/recipedetails/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)

      const query = { _id: new ObjectId(id) };
      const result = await recipeCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    app.get("/userdetails", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log('email:', email)

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      // console.log('decodedemail:', decodedEmail);

      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });





    app.patch("/recipedetails/:id", async (req, res) => {
      const id = req.params.id;
      const userEdit = req.body;

      //user coin updata
      const userEmail = {email:userEdit.coindata.userEmail}
      const userData = await userCollection.find(userEmail).toArray();
      const coindata = userData[0].coin - userEdit.coindata.userCoin;
      
      
      const userCoin = {
        $set:{
            coin: coindata
        }
      }

      const resultuser = await userCollection.updateOne(userEmail, userCoin);
      

      //creator coin update
      const creatorEmail = {email:userEdit.coindata.creatorEmail}
      const CreatorData = await userCollection.find(creatorEmail).toArray();
      const creatordata = CreatorData[0].coin + userEdit.coindata.creatorCoin;

      const creatorCoin = {
        $set:{
            coin: creatordata
        }
      }

      const resultCreator = await userCollection.updateOne(creatorEmail, creatorCoin);
      


    //recipe watchcount and purchaseby update
    const filter = { _id: new ObjectId(id) };
    const recipeData = await recipeCollection.find(filter).toArray();
      const watchCount = recipeData[0].watchCount + 1;
      const purchased_by = recipeData[0].purchased_by;
      const newpurchase = [...purchased_by, userEdit.coindata.userEmail];

      const recipeUpdate = {
        $set:{
            watchCount: watchCount,
            purchased_by: newpurchase
        }
      }

      const resultRecipe = await recipeCollection.updateOne(filter, recipeUpdate);
    

        res.send({resultuser, resultCreator, resultRecipe});
      
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("thezoolandserver is running");
});

app.listen(port, () => {
  console.log(`thezoolandserver is running on port ${port}`);
});
