import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();
export const s3 = new S3Client({ 
  credentials:{
      accessKeyId: process.env.BUCKET_ACCESS_KEY,
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,  
  },
  region: process.env.BUCKET_REGION });

const params = (imageName,buffer,mimetype) => ({
  Bucket: process.env.BUCKET_NAME,
  Key: imageName,
  Body: buffer,
  ContentType: mimetype,
});

export const uploadS3 = async(imageName,buffer,mimetype) => {
    const command = new PutObjectCommand(params(imageName,buffer,mimetype));
    await s3.send(command);
}