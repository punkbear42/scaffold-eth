import React, { useState } from "react";
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import { useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import * as d3 from "d3"

import * as tf from '@tensorflow/tfjs';

const { ethers } = require("ethers");

export default function ListPunks(props) {
  const [punks, setPunks] = useState([])
  const [packaged, setPackaged] = useState([])
  const [model, setModel] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  let gan_contract
  try {
    gan_contract = props.externalContracts[props.selectedChainId].contracts.GAN_PUNK  
  } catch (e) {
    console.error(e)
  }

  function loadGraphRecursive(input) {
    document.getElementById('graph').innerHTML = ''
    loadGraph(input, (input) => {
      setPunks([input])      
    }, (input) => {
      loadGraphRecursive(input)
    })
  }

  const randomPunk = () => {
    let input = []
    for (let i = 0 ; i < 100; i++) {
      input[i] = randn_bm()
    }
    loadGraphRecursive(input)
    setPunks([input])
  }
  useEffect(async function () {
    const model = await tf.loadLayersModel(window.location.origin + '/model.json')
    setModel(model)
    randomPunk()
    
  }, [])

  useEffect(async function () {    
    for (let k = 0; k < punks.length; k++) {
      const prediction = model.predict(tf.tensor([punks[k]]))
      const data = prediction.dataSync()
    
      const canvas = document.querySelector(`.punks canvas[index="${k}"]`)
      const ctx = canvas.getContext('2d');
      for (var i = 0; i < data.length; i++) {                
          data[i] = ((data[i] + 1) / 2) * 255
      }
      var imgData = new ImageData(Uint8ClampedArray.from(data), 24, 24)
      ctx.putImageData(imgData, 0, 0);
    }
  }, [punks])

  useEffect(async function () {
    for (let k = 0; k < packaged.length; k++) {
      const prediction = model.predict(tf.tensor([packaged[k]]))
      const data = prediction.dataSync()
    
      const canvas = document.querySelector(`.punks-packaged canvas[index="${k}"]`)
      const ctx = canvas.getContext('2d');
      for (var i = 0; i < data.length; i++) {                
          data[i] = ((data[i] + 1) / 2) * 255
      }
      var imgData = new ImageData(Uint8ClampedArray.from(data), 24, 24)
      ctx.putImageData(imgData, 0, 0);
    }
  }, [packaged])

  function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
 }

  return (
    <div>Select punks that you want to mint: <div>The first selected punk will be minted to your personal address.</div>
    <div>The punk contract itself will be the owner of the two other selected punks.</div>
    <ToastContainer />
    <ImageList cols={5} sx={{ width: 5*24*6, margin: 'auto' }}>
      {punks.map((item, index) => (
        <ImageListItem className="punks mypunks">
          <canvas index={index} width="24" height="24" onClick={(e) => {
            if (packaged.length >= 3) return
            packaged.push(punks[index])
            setPackaged([...packaged])
          }} ></canvas>   
        </ImageListItem>
      ))}
      </ImageList>      
      <div>
        <div>
        </div>
        <div>
        <ImageList cols={3} sx={{ width: 3*24*6, margin: 'auto' }}>
        {packaged.map((item, index) => (
          <ImageListItem className="punks-packaged mypunks">
            <canvas index={index} width="24" height="24" ></canvas>   
          </ImageListItem>
        ))}
        </ImageList>
        <ButtonGroup sx={{ marginTop: 2 }} >
        <Button variant="contained" onClick={() => {
          document.getElementById('graph').innerHTML = ''
          randomPunk()
        }}>Refresh</Button>
        <Button variant="contained" onClick={() => {
          setPackaged([])
        }}>Clear</Button>
        <Button variant="outlined" onClick={async () => {
          try {
            if (!gan_contract) return setErrorMessage('No network selected in your wallet')
            setErrorMessage('')
            let contract = new ethers.Contract(gan_contract.address, gan_contract.abi, props.signer)
            const tx = await contract.safeMint(packaged.map((ar) => ar.map((el) => el.toString())))
            toast('pending transaction ' + tx.hash)
            console.log(tx.hash)
            setErrorMessage('')
          } catch (e) {
            console.error(e)
            toast(e.message)
            setErrorMessage(e.message)
          }          
        }}>Mint</Button>
        </ButtonGroup>
        <div>{errorMessage}</div>
        <svg id="graph" width="1500" height="500"></svg>
        </div>
      </div>
  </div>
  );
}


function loadGraph (points, cbInput, cbReload) {
  var svg = d3.select("svg"),
  margin = {top: 20, right: 20, bottom: 30, left: 50},
  width = +svg.attr("width") - margin.left - margin.right,
  height = +svg.attr("height") - margin.top - margin.bottom;
  
  points = points.map((el, index) => {
    return [index, el]
  })

  /*
  let points = d3.range(1, 10).map(function(i) {
    return [i * width / 10, 50 + Math.random() * (height - 100)];
  });
  */

  var x = d3.scaleLinear()
    .rangeRound([0, width]);

  var y = d3.scaleLinear()
    .rangeRound([height, 0]);

  var xAxis = d3.axisBottom(x),
    yAxis = d3.axisLeft(y);

  let drag = d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
        
  svg.append('rect')
    .attr('class', 'zoom')
    .attr('cursor', 'move')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  var focus = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain(d3.extent(points, function(d) { return d[0]; }));
  y.domain([-4, 4])
  //y.domain(d3.extent(points, function(d) { return d[1]; }));

  var line = d3.line()
    .x(function(d) { return x(d[0]); })
    .y(function(d) { return y(d[1]); });

  focus.append("path")
    .datum(points)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 1.5)
    .attr("d", line);
    

  focus.selectAll('circle')
    .data(points)
    .enter()
    .append('circle')
    .attr('r', 5.0)
    .attr('cx', function(d) { return x(d[0]);  })
    .attr('cy', function(d) { return y(d[1]); })
    .style('cursor', 'pointer')
    .style('fill', 'steelblue');

  focus.selectAll('circle')
        .call(drag);

  focus.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);
    
  focus.append('g')
    .attr('class', 'axis axis--y')
    .call(yAxis);

    let currentCoord
  
  function dragstarted(d) {
      d3.select(this).raise().classed('active', true);
      currentCoord = {
        x:d.x,
        y:d.y
      }
  }

  
  
  function dragged(d) {      
      d[0] = currentCoord.x
      d[1] = d.y
      d3.select(this)
          .attr('cx', currentCoord.x) // back to pixels
          .attr('cy', d.y)
      // focus.selectAll('path').attr('d', line);
      points[d.subject[0]] = [d.subject[0], y.invert(d.y)]
      cbInput(points.map((el) => { return el[1] }))
      
  }
  
  function dragended(d) {
    points[d.subject[0]] = [d.subject[0], y.invert(d.y)]
    cbReload(points.map((el) => { return el[1] }))
      
      d3.select(this).classed('active', false);
  }

}


