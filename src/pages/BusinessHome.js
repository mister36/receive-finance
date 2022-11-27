// import { useState } from "react";
import { Wallet } from "xrpl";
import Popup from "reactjs-popup";
import { TypeAnimation } from "react-type-animation";
import "reactjs-popup/dist/index.css";
import "../App.css";

const generateWallet = () => {
  const wallet = Wallet.generate();
  console.log(wallet);
};

function App() {
  return (
    <div className="business-container">
      <div className="header">Actions</div>

      <div className="action-container">
        <div className="action-header">
          A wallet is necessary in order to issue and sell receivables. Create
          one below to begin using Receive Finance
        </div>

        <Popup
          trigger={<div className="button">Generate wallet</div>}
          position="center center"
          modal
          onOpen={generateWallet}
          contentStyle={{
            background: "#000",
            borderWidth: 0,
            height: "200px",
            width: "500px",
            padding: "25px",
            borderRadius: "5px",
          }}
        >
          {(close) => (
            <div className="private-key-modal">
              <div className="header">
                <span id="highlight">SAVE THIS PRIVATE KEY!</span> This allows
                you to access your funds and participate on this platform.
                Failure to do so will mean irreversible loss of funds.
              </div>

              <TypeAnimation
                sequence={["This is a test"]}
                cursor={false}
                speed={80}
              />
            </div>
          )}
        </Popup>
      </div>
    </div>
  );
}

export default App;
