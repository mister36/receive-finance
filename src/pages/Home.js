import { useNavigate } from "react-router-dom";
import "../App.css";

function App() {
  const navigate = useNavigate();

  return (
    <div className="App">
      <div className="main-content">
        <div className="left">
          <div className="header">Receive Finance: Unlock Liquidity in A/R</div>
          <div className="subheader">
            Receive allows businesses to tokenize their account receivables and
            access future funds in a fraction of the time. Our service enables
            investors to earn guaranteed yield from a previously walled-off
            asset class.
          </div>
        </div>

        <div className="right">
          <div
            className="button"
            id="wallet"
            onClick={() => navigate("/investor")}
          >
            Connect wallet
          </div>

          <div className="button" id="signup" onClick={() => navigate("/auth")}>
            Sign up <span id="small">(Required for businesses)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
