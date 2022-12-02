function Receivable({ type = "", name = "", date = "", amount }) {
  return (
    <div className="receivable-component">
      <div id="name">{name}</div>

      <div id="date">{date}</div>
      <div id="amount">{amount}</div>

      <div
        id="button"
        style={{ background: type === "out" ? "#F0B700" : "#1d9e23" }}
      >
        {type === "out" ? "PAY" : "SELL"}
      </div>
    </div>
  );
}

export default Receivable;
