import express, { urlencoded } from "express";
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))
//Since data will come from url or from or in json form or in the format of form to figure that out the next some lines will help 

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:
    "16kb"}))

app.use(express.static("public")) //this is for static files(images, pdfs) in my server so it is public asset anyone can access

app.use(cookieParser())


//routes import 
import userRouter from './routes/userRoutes.js'



//routes declaration
app.use("/api/v1/users/",userRouter) 



//http://localhost:8000/api/v1/users/register    // aisa route bnare 

import consultRouter from './routes/consultRoutes.js';

app.use('/api/v1/consultations',consultRouter);

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500
    const message = err.message || 'Something went wrong'
    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || []
    })
})

export default app