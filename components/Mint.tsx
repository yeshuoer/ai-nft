'use client'

import { MintContractAddress, abi } from "@/constants"
import Image from "next/image"
import { NFTStorage } from "nft.storage"
import { FormEvent, useEffect, useState } from "react"
import { parseEther } from "viem"
import { useAccount, useClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi"

export default function Mint() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [url, setURL] = useState("")

  const [message, setMessage] = useState("")
  const [isWaiting, setIsWaiting] = useState(false)
  const [isAIGenerating, setIsAIGenerating] = useState(false)

  const { data: hash, isPending, writeContractAsync, error: mintError } = useWriteContract()
  const {isLoading: isConfirming, isSuccess: isConfirmed} = useWaitForTransactionReceipt({
    hash
  })

  useEffect(() => {
    let m = ""
    if (mintError) {
      m = mintError.name
    }
    if (isConfirming) {
      m = 'Waiting for confirming...'
    }
    setMessage(m)
  }, [mintError, isConfirming])

  const createImage = async () => {
    setMessage("Generating Image...")
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
      {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_REACT_APP_HUGGING_FACE_API_KEY}` },
        method: "POST",
        body: JSON.stringify({
          inputs: description, options: { wait_for_model: true },
        }),
      }
    );
    const data = await response.arrayBuffer()
    const type = response.headers.get('content-type')
    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page
    console.log('img is', img)
    console.log('data is', data)
    setImage(img)
    return data
  }

  const uploadImage = async (imageData: ArrayBuffer) => {
    setMessage("Uploading Image...")
    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({ token: process.env.NEXT_PUBLIC_REACT_APP_NFT_STORAGE_API_KEY as string })
    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })
    console.log('ipnft is', ipnft)
    // Save the URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setURL(url)
    return url
  }

  const mintImage = async (tokenURI: string) => {
    setMessage("Waiting for Mint...")
    try {
      await writeContractAsync({
        abi: abi,
        address: MintContractAddress,
        functionName: 'mint',
        args: [tokenURI],
        value: parseEther('0.1'),
      })
    } catch (err) {
      console.log('mint error', err)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setImage("")
    setIsWaiting(true)
    setIsAIGenerating(true)
    // Call AI API to generate a image based on description
    const imageData = await createImage()
    setIsAIGenerating(false)
    // Upload image to IPFS (NFT.Storage)
    const url = await uploadImage(imageData)
    // Mint NFT
    await mintImage(url)
    setIsWaiting(false)
    setMessage("")
  }


  return <div className="mx-auto max-w-4xl h-2/3 mt-10 flex justify-around items-center my-12">
    {/* form */}
    <form className=" w-1/3" onSubmit={handleSubmit}>
      <div className="mb-5">
        <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
        <input
          type="text"
          id="name"
          placeholder="Create a name..."
          onChange={(e) => { setName(e.target.value) }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-5">
        <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Description</label>
        <textarea
          id="description"
          placeholder="Create a description..."
          onChange={(e) => { setDescription(e.target.value) }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          required
        />
      </div>

      <button
        disabled={isWaiting}
        type="submit"
        className="text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none">
        Create & Mint
      </button>


      {
        hash && <p>Transaction Hash: {hash}</p>
      }
      {
        isConfirming && <p>Confirming...</p>
      }
      {
        isConfirmed && <p>Confirmed</p>
      }
    </form>

    <div className="relative">
      {/* image */}
      <div className="border-blue-500 border-4 w-[18rem] h-[18rem] flex justify-center items-center">
        {
          image && <Image alt="AI Image" src={image} width={400} height={400} />
        }
        {
          isAIGenerating && <Image src="/Spinner.svg" alt="Spinner" width={80} height={80} />
        }
      </div>
      {/* message */}
      {
        message &&
        <div className="absolute w-full text-center p-4 mt-2 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
          {message}
        </div>
      }
    </div>
  </div>
}
