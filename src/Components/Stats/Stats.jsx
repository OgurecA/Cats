import React from 'react'
import './Stats.css';
import Count from '../Count/Count';
import ProgressBar from '../Bar/Bar';

function Stats({ harrisPercentage, trumpPercentage }) {
    return (
      <div className="stats-container">
        <ProgressBar harrisPercentage={harrisPercentage} trumpPercentage={trumpPercentage} />
        <div className="head-bar">
          <Count count={trumpPercentage} label={"Donald Trump"} className="TR"/>
        </div>
        <div className="head-bar">
          <Count count={harrisPercentage} label={"Kamala Harris"} className="HS"/>
        </div>
      </div>
    );
  }
  
  export default Stats;