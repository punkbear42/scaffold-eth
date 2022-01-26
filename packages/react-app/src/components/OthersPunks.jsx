import React, { useState, useRef } from "react";
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import { useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TextField } from '@mui/material';

import * as tf from '@tensorflow/tfjs';

const { ethers } = require("ethers");

export default function OthersPunks(props) {
  const [address, setAddress] = useState('')
  const [punks, setPunks] = useState([])
  const [model, setModel] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const inputText = useRef()
  let gan_contract
  try {
    gan_contract = props.externalContracts[props.selectedChainId].contracts.GAN_PUNK  
  } catch (e) {
    console.error(e)
  }

  useEffect(async () => {
    if (!gan_contract) return setErrorMessage('No network selected in your wallet')
    setErrorMessage('')
    const model = await tf.loadLayersModel(window.location.origin + '/model.json')
    setModel(model)
    const urlParams = new URLSearchParams(window.location.search)
    const search = urlParams.get('search')
    const parsed = parseInt(search)
    if (!Number.isNaN(parsed)) {
      inputText.current.value = search
      let contract = new ethers.Contract(gan_contract.address, gan_contract.abi, props.signer)
      let latentSpace = await contract.latentSpaceOf(parsed)
      latentSpace = latentSpace.map((el) => parseFloat(el))
      setPunks([latentSpace])
      setErrorMessage('')
    }
  }, [props.selectedChainId])

  useEffect(async function () {
    if (!address) return
    if (!gan_contract) return setErrorMessage('No network selected in your wallet')
    setErrorMessage('')
    try {
      const model = await tf.loadLayersModel(window.location.origin + '/model.json')
      setModel(model)
      let contract = new ethers.Contract(gan_contract.address, gan_contract.abi, props.signer)
      const balance = await contract.balanceOf(address)
      const ownedPunks = []
      for (let k = 0; k< balance; k++) {
        try {      
          const tokenId = await contract.tokenOfOwnerByIndex(address, k)
          let latentSpace = await contract.latentSpaceOf(tokenId)
          latentSpace = latentSpace.map((el) => parseFloat(el))
          ownedPunks.push(latentSpace)
        } catch (e) {
          console.error(e)
          toast(e.message)
        }
      }
      setPunks(ownedPunks)
      setErrorMessage('')
    } catch (e) {
      setErrorMessage(e.message)
    }
  }, [address])

  useEffect(async function () {    
    for (let k = 0; k < punks.length; k++) {
      const prediction = model.predict(tf.tensor([punks[k]]))
      const data = prediction.dataSync()
    
      const canvas = document.querySelector(`.mypunks canvas[index="${k}"]`)
      const ctx = canvas.getContext('2d');
      for (var i = 0; i < data.length; i++) {                
          data[i] = ((data[i] + 1) / 2) * 255
      }
      var imgData = new ImageData(Uint8ClampedArray.from(data), 24, 24)
      ctx.putImageData(imgData, 0, 0);
    }
  }, [punks])

  return (
    <div><ToastContainer />
    <TextField ref={inputText} variant="outlined" sx={{ marginTop: 2 }} label="address or ens name"
      onChange={(e) => {
        setAddress(e.target.value)
      }}
    /><div>{punks.length} punk(s)</div>
    <ImageList cols={5} sx={{ width: 5*24*6, margin: 'auto' }} >
      {punks.map((item, index) => (
        <ImageListItem className="mypunks">
          <canvas index={index} width="24" height="24" ></canvas>   
        </ImageListItem>
      ))}
      </ImageList>
      <div>{errorMessage}</div>
  </div>
  );
}
