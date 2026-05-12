import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB=async ()=>{
    try {
       const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) 

       console.log(`\n MONGODB connected !! DB Host ${connectionInstance.connection.host}`);
    
    
       
    } catch (error) {
        console.log("MONGODB connection error");
        process.exit(1);
    }
}
// ye sb br br likhne se behtr h utility bnado iski and then make the work a cake walk because we will be refering to the db back to back so to make work easy .

export default connectDB