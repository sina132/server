const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`listening to port ${PORT}`));
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
    res.send("hello")
})

mongoose.connect('mongodb+srv://user:13841384@cluster0.zmxjift.mongodb.net/db1').then(()=>console.log("connected to database"));
const userSchema = new mongoose.Schema({
    username : {type:String,required:true,unique:true},
    email : {type:String,required:true,unique:true},
    password : {type:String,required:true},
    verified : {type:Boolean,required:true,default:false},
    token : {type:String},
    email_token : {type:String},
    
    data : {
        income:{type:Number,default:0},
        expenses:{type:Object,default:{

            basic_necessities:{
                housing:[],
                utilities:[],
                food:[],
                transportation:[]
            },
    
            health_and_wellness:{
                health_insurance:[],
                doctor_visits:[],
                medication:[]
            },
    
            fitness:{
                gym_membership:[],
                sports_equipment:[]
            },
    
            personal_care:{
                haircuts_or_salon_services:[],
                skincare:[],
                personal_hygiene_products:[],
                clothing_and_accessories:[]
            },
    
            child_care:{
                daycare:[],
                babysitters:[],
                school_supplies:[],
                extracurricular_activities:[]
            },
    
            pet_care:{
                pet_food:[],
                veterinary_bills:[],
                pet_grooming:[],
                pet_accessories:[]
            },
    
            financial_obligations:{
                debts:[],
                savings_and_investments:[]
            },
    
            entertainment:{
                movies:[],
                games:[],
                concerts:[],
                hobbies:[],
            },
    
            travel:{
                flights:[],
                accommodations:[],
                vacation_activities:[]
            },
    
            other:{
                gifts:[],
                donations:[],
                unexpected_expenses:[],
                other:[]
            }
    
        }}
    }
})
const database = mongoose.model("expense-tracker",userSchema);

function hash(password){
    const saltRounds = 10;
    const salt =  bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(password,salt);
}


//signin: (username,password,email)
app.post('/api/signin', async (req,res)=>{
    try{
        let {username,password,email} = req.body;
        password = hash(password);

        //adding new user
        const email_token = Math.floor(Math.random()*10000000000).toString(36);
        const newUser = new database({"username":username,"password":password,"email":email,"email_token":email_token});
        await newUser.save();

        //creating new email_token and sending it;
        const transporter = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:'jg1542264@gmail.com',
                pass:'fpti jttg zvoj wrbs'
            }
        })
        const options = {
            from:"expense tracker",
            to:email,
            subject:"expense tracker verification",
            text:`your token is ${email_token}`
        }
        await transporter.sendMail(options);
        res.sendStatus(200);
    }
    catch(err){
        res.sendStatus(202);
    }   

    

})


//verifing email_token: (username,email_token)
app.post('/api/verify', async(req,res)=>{
    const user = await database.findOne({"username":req.body.username});
    if(user.email_token == req.body.email_token){
        user.verified = true;
        await user.save();
        res.sendStatus(200);
    }
    else{
        res.sendStatus(404);
    }
})


//login:(username,password)
app.post('/api/login', async(req,res)=>{
    try{
        const {username,password} = req.body;
        const user = await database.findOne({"username":username});
        if(bcrypt.compareSync(password,user.password) && user.verified){
            const token = jwt.sign({userId:user._id},'secret',{expiresIn:'1h'});
            user.token = token;
            await user.save();
            res.status(200).send(token);
        }
        else{
            res.sendStatus(202);
        }
    } 
    catch(err){
        res.sendStatus(202);
    }
})


//adding expense:(token,main,child,expense,cost)  adding a new expense
app.post('/api/add', async (req, res) => {
    const { token, main, child, expense, cost} = req.body;
    const date = Date.now();

    jwt.verify(token, 'secret', async (err, decoded) => {
        if (err) {
            return res.sendStatus(404);
        }

        const user = await database.findOne({"token":token});

        let expenses = JSON.parse(JSON.stringify(user.data.expenses));
        //deep clone
        expenses[main][child].push([expense,cost,date]);

        user.data.expenses = expenses;
        user.data.income -= cost;

        await user.save();
        return res.sendStatus(200);
    });
});


//income:(token,income)  updating the income
app.post('/api/income', async(req,res)=>{
    const {token,income} = req.body;
    jwt.verify(token,'secret',async(err,decoded)=>{
        if(err){
            return res.sendStatus(404);
        }
        const user = await database.findOne({"token":token});
        user.data.income = income;
        await user.save();
        res.sendStatus(200);
    })
})

//getting expenses:(token)  getting the income and the expenses
app.post('/api/get',async(req,res)=>{
    const token = req.body.token;
    jwt.verify(token,'secret',async(err,decoded)=>{
        if(err){
            return res.sendStatus(404);
        }
        const user = await database.findOne({"token":token});
        res.status(200).send(user.data);
        
    })

})



