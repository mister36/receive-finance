import { useState, useEffect } from "react";
import { Wallet } from "xrpl";
import Popup from "reactjs-popup";
import { TypeAnimation } from "react-type-animation";
import { useAuthStore } from "../stores";
import "reactjs-popup/dist/index.css";
import "../App.css";
import axios from "axios";

axios.defaults.withCredentials = true;

function App() {
  const [wallet, hasWallet, updateWallet, updateWalletStatus] = useAuthStore(
    (state) => [
      state.wallet,
      state.hasWallet,
      state.updateWallet,
      state.updateWalletStatus,
    ]
  );

  const [popupOpen, setPopupOpen] = useState(false);

  const generateWallet = () => {
    const newWallet = Wallet.generate();
    updateWallet(newWallet);
    console.log(newWallet);
  };

  const savedSecretKey = async () => {
    setPopupOpen(false);
    try {
      const response = await axios.post("/api/v1/auth/wallet/update");
      updateWalletStatus();
      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const checkWalletStatus = async () => {
      try {
        const response = await axios.get("/api/v1/auth/wallet");

        console.log("response.data.hasWallet", response.data.hasWallet);

        if (response.data.hasWallet) {
          updateWalletStatus();
        }
      } catch (error) {
        console.log(error);
      }
    };
    checkWalletStatus();
  }, []);

  useEffect(() => {
    console.log("hasWallet:", hasWallet);
  }, [hasWallet]);

  return (
    <div className="business-container">
      <div className="header">Actions</div>

      <div className="action-container">
        {hasWallet && !popupOpen ? (
          <></>
        ) : (
          <>
            <div className="action-header">
              A wallet is necessary in order to issue and sell receivables.
              Create one below to begin using Receive Finance
            </div>
            <div className="button" onClick={() => setPopupOpen(true)}>
              Generate wallet
            </div>
            <Popup
              open={popupOpen}
              position="center center"
              modal
              onOpen={generateWallet}
              closeOnDocumentClick={false}
              closeOnEscape={false}
              contentStyle={{
                background: "#000",
                borderWidth: 0,
                height: "275px",
                width: "500px",
                padding: "25px",
                borderRadius: "5px",
              }}
            >
              {() => (
                <div className="private-key-modal">
                  <div className="header">
                    <span id="highlight">SAVE THIS PRIVATE KEY!</span> This
                    allows you to access your funds and participate on this
                    platform. Failure to do so will mean irreversible loss of
                    funds.
                  </div>

                  <div className="private-key-container">
                    {wallet ? (
                      <TypeAnimation
                        sequence={[wallet.privateKey]}
                        cursor={false}
                        speed={80}
                      />
                    ) : null}
                  </div>

                  <div className="button" onClick={savedSecretKey}>
                    I saved it
                  </div>
                </div>
              )}
            </Popup>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
