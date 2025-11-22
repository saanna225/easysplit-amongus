import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Calculator = () => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay("0.");
      setNewNumber(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    if (operation && !newNumber) {
      calculate();
    }
    setPreviousValue(display);
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = () => {
    if (!previousValue || !operation) return;

    const prev = parseFloat(previousValue);
    const current = parseFloat(display);
    let result = 0;

    switch (operation) {
      case "+":
        result = prev + current;
        break;
      case "-":
        result = prev - current;
        break;
      case "×":
        result = prev * current;
        break;
      case "÷":
        result = current !== 0 ? prev / current : 0;
        break;
    }

    setDisplay(result.toString());
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const backspace = () => {
    if (display.length === 1 || newNumber) {
      setDisplay("0");
      setNewNumber(true);
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <div className="mb-4 p-4 bg-muted rounded-lg text-right">
          <div className="text-sm text-muted-foreground mb-1 h-5">
            {previousValue && operation && `${previousValue} ${operation}`}
          </div>
          <div className="text-3xl font-bold truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" onClick={clear} className="col-span-2">
            Clear
          </Button>
          <Button variant="outline" onClick={backspace}>
            ⌫
          </Button>
          <Button variant="outline" onClick={() => handleOperation("÷")}>
            ÷
          </Button>

          <Button variant="outline" onClick={() => handleNumber("7")}>
            7
          </Button>
          <Button variant="outline" onClick={() => handleNumber("8")}>
            8
          </Button>
          <Button variant="outline" onClick={() => handleNumber("9")}>
            9
          </Button>
          <Button variant="outline" onClick={() => handleOperation("×")}>
            ×
          </Button>

          <Button variant="outline" onClick={() => handleNumber("4")}>
            4
          </Button>
          <Button variant="outline" onClick={() => handleNumber("5")}>
            5
          </Button>
          <Button variant="outline" onClick={() => handleNumber("6")}>
            6
          </Button>
          <Button variant="outline" onClick={() => handleOperation("-")}>
            -
          </Button>

          <Button variant="outline" onClick={() => handleNumber("1")}>
            1
          </Button>
          <Button variant="outline" onClick={() => handleNumber("2")}>
            2
          </Button>
          <Button variant="outline" onClick={() => handleNumber("3")}>
            3
          </Button>
          <Button variant="outline" onClick={() => handleOperation("+")}>
            +
          </Button>

          <Button variant="outline" onClick={() => handleNumber("0")} className="col-span-2">
            0
          </Button>
          <Button variant="outline" onClick={handleDecimal}>
            .
          </Button>
          <Button onClick={calculate} className="bg-primary">
            =
          </Button>
        </div>
      </Card>
    </div>
  );
};