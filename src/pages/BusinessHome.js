import { useState, useEffect } from "react";
import { Wallet } from "xrpl";
import Popup from "reactjs-popup";
import { TypeAnimation } from "react-type-animation";
import axios from "axios";
import { useAuthStore } from "../stores";
import Receivable from "../components/Receivable";
import "reactjs-popup/dist/index.css";
import "../App.css";

axios.defaults.withCredentials = true;

function BusinessHome() {
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
      <div className="header">Dashboard</div>

      {hasWallet && !popupOpen ? (
        <div className="dashboard">
          <div className="left">
            <div className="header">Receivables</div>

            <div className="receivable-container">
              <div className="out">
                <div className="header">Out</div>

                <div className="receivables-box">
                  <div className="receivables-wrapper">
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                  </div>
                </div>
              </div>

              <div className="horizontal-line"></div>

              <div className="in">
                <div className="header">In</div>

                <div className="receivables-box">
                  <div className="receivables-wrapper">
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="right">
            <div className="vertical-line"></div>
            <div className="data-container">
              <div className="entry">
                <div className="sub-header">XRP account balance</div>
                <div className="info-wrapper">
                  <img src="xrp.png" className="logo" alt="" />
                  <div className="info">182,052.23</div>
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Amount owed</div>
                <div className="info" style={{ color: "#22cd2a" }}>
                  +$56,232.10
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Amount due</div>
                <div className="info" style={{ color: "#f24b4b" }}>
                  -$25,128.00
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Net</div>
                <div className="info" style={{ color: "#22cd2a" }}>
                  $41,104
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Pool size</div>
                <div className="info-wrapper">
                  <img src="xrp.png" className="logo" alt="" />
                  <div className="info">15,023,123.23</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="action-container">
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
          </div>
        </>
      )}
    </div>
  );
}

export default BusinessHome;
