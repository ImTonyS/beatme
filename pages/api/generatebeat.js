
import axios from "axios";
import Replicate from "replicate";

export default async function handler(req, res) {
  console.log(req.body)
  const body = req.body 
  const text = body.text

  const replicateToken = process.env.REPLICATE_API_TOKEN

  
  try {
  const replicate = new Replicate({
    auth: replicateToken,
  });

  const output = await replicate.run(
    "meta/musicgen:7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906",
    {
      input: {
        model_version: "melody",
        prompt: text,
        duration: 4,
        output_format: "mp3"
      }
    }
  );

  console.log(output)


 res.status(200).json({
  url: output
 })


  } catch (error) {
    console.log("paso un error con el backend", error)
    res.status(500).json(error)
  }
  


  
}

