import toast, { Toaster } from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Connection,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  SendTransactionError,
} from "@solana/web3.js";
import { useStorageUpload } from "@thirdweb-dev/react";

import axios from "axios";

const SOLANA_NETWORK = "devnet";

const Home = () => {
  const [publicKey, setPublicKey] = useState(null);
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount] = useState(null);
  const [explorerLink, setExplorerLink] = useState(null);

  const [uploadUrl, setUploadUrl] = useState(null);
  const [url, setUrl] = useState(null);
  const [statusText, setStatusText] = useState("");

  const [genre, setGenre] = useState(null);
  const [descripcion, setDescription] = useState(null);
  const [beatUrl, setBeaturl] = useState("jkdsfnbjkdfsbhjb");
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let key = window.localStorage.getItem("publicKey"); //obtiene la publicKey del localStorage
    setPublicKey(key);
    if (key) getBalances(key);
    if (explorerLink) setExplorerLink(null);
  }, []);
  
  
  
 const handleReceiverChange = (event) => {
    setReceiver(event.target.value);
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
  };

  const handleSubmit = async () => {
    console.log("Este es el receptor", receiver);
    console.log("Este es el monto", amount);
    sendTransaction();
  };

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
    console.log("Si se esta seteando la URL", url);
  };

  //Funcion para Iniciar sesion con nuestra Wallet de Phantom

  const signIn = async () => {
    //Si phantom no esta instalado
    const provider = window?.phantom?.solana;
    const { solana } = window;

    if (!provider?.isPhantom || !solana.isPhantom) {
      toast.error("Phantom no esta instalado");
      setTimeout(() => {
        window.open("https://phantom.app/", "_blank");
      }, 2000);
      return;
    }
    //Si phantom esta instalado
    let phantom;
    if (provider?.isPhantom) phantom = provider;

    const { publicKey } = await phantom.connect(); //conecta a phantom
    console.log("publicKey", publicKey.toString()); //muestra la publicKey
    setPublicKey(publicKey.toString()); //guarda la publicKey en el state
    window.localStorage.setItem("publicKey", publicKey.toString()); //guarda la publicKey en el localStorage

    toast.success("Tu Wallet esta conectada 👻");

    getBalances(publicKey);
  };

  //Funcion para cerrar sesion con nuestra Wallet de Phantom

  const signOut = async () => {
    if (window) {
      const { solana } = window;
      window.localStorage.removeItem("publicKey");
      setPublicKey(null);
      solana.disconnect();
      router.reload(window?.location?.pathname);
    }
  };

    const generateBeat = async () => {
      console.log("mandando al servidor")
    const data = {
      text: genre + descripcion
    }

    setLoading(true)
    setBeaturl(null)


    try {
      const response = await  axios.post("/api/generatebeat", data)
      console.log(response.data.url)
      //respuesta de replicate

      setBeaturl(response.data.url)

    } catch (error) {
      console.log("paso un error con el backend")
    }

    setLoading(false)
    
  


  };

  const handleGenreOnChange = (e) => {
    console.log("make a beat of ", e.target.value);
    setGenre("make a beat of " + e.target.value);
  };

  const handleDescriptionOnChange = (e) => {
    console.log(" with this description ", e.target.value);
    setDescription(" with this description " + e.target.value);
  };

  //Funcion para obtener el balance de nuestra wallet

  const getBalances = async (publicKey) => {
    try {
      const connection = new Connection(
        clusterApiUrl(SOLANA_NETWORK),
        "confirmed"
      );

      const balance = await connection.getBalance(new PublicKey(publicKey));

      const balancenew = balance / LAMPORTS_PER_SOL;
      setBalance(balancenew);
    } catch (error) {
      console.error("ERROR GET BALANCE", error);
      toast.error("Something went wrong getting the balance");
    }
  };

  //Funcion para enviar una transaccion
  const sendTransaction = async () => {
    try {
      //Consultar el balance de la wallet
      getBalances(publicKey);
      console.log("Este es el balance", balance);

      //Si el balance es menor al monto a enviar
      if (balance < amount) {
        toast.error("No tienes suficiente balance");
        return;
      }

      const provider = window?.phantom?.solana;
      const connection = new Connection(
        clusterApiUrl(SOLANA_NETWORK),
        "confirmed"
      );

      //Llaves

      const fromPubkey = new PublicKey(publicKey);
      const toPubkey = new PublicKey(receiver);

      //Creamos la transaccion
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
      console.log("Esta es la transaccion", transaction);

      //Traemos el ultimo blocke de hash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      //Firmamos la transaccion
      const transactionsignature = await provider.signTransaction(transaction);

      //Enviamos la transaccion
      const txid = await connection.sendRawTransaction(
        transactionsignature.serialize()
      );
      console.info(`Transaccion con numero de id ${txid} enviada`);

      //Esperamos a que se confirme la transaccion
      const confirmation = await connection.confirmTransaction(txid, {
        commitment: "singleGossip",
      });

      const { slot } = confirmation.value;

      console.info(
        `Transaccion con numero de id ${txid} confirmado en el bloque ${slot}`
      );

      const solanaExplorerLink = `https://explorer.solana.com/tx/${txid}?cluster=${SOLANA_NETWORK}`;
      setExplorerLink(solanaExplorerLink);

      toast.success("Transaccion enviada con exito :D ");

      //Actualizamos el balance
      getBalances(publicKey);
      setAmount(null);
      setReceiver(null);

      return solanaExplorerLink;
    } catch (error) {
      console.error("ERROR SEND TRANSACTION", error);
      toast.error("Error al enviar la transaccion");
    }
  };

  //Función para subir archivos a IPFS

  const { mutateAsync: upload } = useStorageUpload();

  const uploadToIpfs = async (file) => {
    setStatusText("Subiendo a IPFS...");
    const uploadUrl = await upload({
      data: [file],
      options: {
        uploadWithGatewayUrl: true,
        uploadWithoutDirectory: true,
      },
    });
    return uploadUrl[0];
  };

  // URL a Blob
  const urlToBLob = async (file) => {
    setStatusText("Transformando url...");
    await fetch(url)
      .then((res) => res.blob())
      .then((myBlob) => {
        // logs: Blob { size: 1024, type: "image/jpeg" }

        myBlob.name = "blob.png";

        file = new File([myBlob], "image.png", {
          type: myBlob.type,
        });
      });

    const uploadUrl = await uploadToIpfs(file);
    console.log("uploadUrl", uploadUrl);

    setStatusText(`La url de tu archivo es: ${uploadUrl} `);
    setUploadUrl(uploadUrl);

    return uploadUrl;
  };

  //Funcion para crear un NFT
  const generateNFT = async () => {
    try {
      setStatusText("Creando tu NFT...❤");
      const mintedData = {
        name: "Mi primer NFT con Superteam MX",
        imageUrl: uploadUrl,
        publicKey,
      };
      console.log("Este es el objeto mintedData:", mintedData);
      setStatusText(
        "Minteando tu NFT en la blockchain Solana 🚀 Porfavor espera..."
      );
      const { data } = await axios.post("/api/mintnft", mintedData);
      const { signature: newSignature } = data;
      const solanaExplorerUrl = `https://solscan.io/tx/${newSignature}?cluster=${SOLANA_NETWORK}`;
      console.log("solanaExplorerUrl", solanaExplorerUrl);
      setStatusText("¡Listo! Tu NFT se a creado, revisa tu Phantom Wallet 🖖");
    } catch (error) {
      console.error("ERROR GENERATE NFT", error);
      toast.error("Error al generar el NFT");
    }
  };

  return (
    <div className=" min-h-screen bg-gradient-to-t from-[#ff0090] to-[#800080]">
      <div className="flex flex-col py-24 place-items-center justify-center px-4">
        <div>
          <span className="text-5xl font-bold pb-5 text-[#ffff]">Beat</span>
          <span className="text-5xl font-bold pb-5 text-[#ff0090]">-Me</span>
        </div>
        <h1 className="text-4xl mt-3 font-bold text-[#ffff] italic">
          Your personal Beat-Maker
        </h1>

        {publicKey ? (
          <div className="flex flex-col py-20 place-items-center justify-center w-full md:px-20 max-w-2xl">
            
            {!loading  ? (
             <>
               <label
              for="countries"
              className="block mb-2 text-1xl font-bold text-[#ffff] dark:text-white"
            >
              Select an option
            </label>
            <select
              id="countries"
              className="bg-gray-50 border border-gray-300 mb-8 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              onChange={(e) => {
                handleGenreOnChange(e);
              }}
            >
              <option selected>Choose your music genre</option>
              <option value="RAP">Rap</option>
              <option value="CLASSIC MUSIC">Classic</option>
              <option value="TRAP">Trap</option>
              <option value="REGAETTON">Regaetton</option>
              <option value="POP">Pop</option>
              <option value="ELECTRONIC MUSIC">Electronic</option>
              <option value="ROCK MUSIC">Rock</option>
            </select>

            <label
              for="message"
              className="block mb-2 text-1xl font-bold text-[#ffff] dark:text-white"
            >
              Be precise with your ideas
            </label>

            <textarea
              id="message"
              rows="3"
              className="block p-2.5 w-full mb-8 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Edo25 major g melodies that sound triumphant and cinematic. Leading up to a crescendo that resolves in a 9th harmonic..."
              onChange={(e) => {
                handleDescriptionOnChange(e);
              }}
            ></textarea>

<div className="flex flex-col ">
              <button
                type="submit"
                className="inline-flex mb-4 h-8 w-52 rounded-full justify-center bg-[#581845]  font-bold text-white"
                onClick={() => {
                  generateBeat();
                }}
              >
                Generate 
              </button>

            
            </div>
             </>
            ): (
              <p className="text-white py-8">Generating your beat...</p>
            )}

            {
              beatUrl && (
              <>

                 <a href={beatUrl} target="_blank" className="text-white text-3xl font-bold underline cursor-pointer my-8">Click to listen your beat </a> 
               </>
              )
            }

<button
                type="submit"
                className="inline-flex h-8 w-52 rounded-full justify-center bg-[#581845] font-bold text-white "
                onClick={() => {
                  signOut();
                }}
              >
                Disconnect my wallet
              </button>

            
          </div>
        ) : (
          <div className="flex flex-col place-items-center justify-center my-16 ">
            <button
              type="submit"
              className="inline-flex h-8 w-52 justify-center bg-purple-500 font-bold text-white"
              onClick={() => {
                signIn();
              }}
            >
              Connect my wallet 👻
            </button>
          </div>
        )}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
};

export default Home;
