import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
//node k andr file system milta h by default , helps in read write and remove in async sync , open directory ,paths we use this fs

const uploadOnCloudinary=async (localFilePath)=>{
    try {
        if(!localFilePath){
            return null
        }
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully 
        fs.unlink(localFilePath)
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath)//removes the locally saved temporary file
        //ye kaam hona hi chahiye uske bd hi kch krenge isiliye sync
        return null;
    }
}


cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
          
});


export {uploadOnCloudinary}