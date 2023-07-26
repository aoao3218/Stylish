import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.SECRET;
const timing = 30 * 24 * 60 * 60;
const signData = (user) => ({
  id: user.id,
  provider: user.provider,
  name: user.name,
  email: user.email,
  picture: user.picture
});


export const catchToken = async(req,res,next) =>{
    try{
        const { access_token } = req.cookies;
        if (!access_token) {
            throw {status:401,message:"token doesn't exist"};
        }
        const user = jwt.verify(access_token, secret);
        req.id = user.id;
        next();
    }catch(err){
        next(err);
    }
  };
  