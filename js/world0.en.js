/* World 0 — English text overlay. Same structure as js/world0.js (array positions must match);
   widgets, conditions and answers come from the Hebrew file. Markup: [[conceptId]] or [[conceptId|shown text]]. */
(function () {
  "use strict";
  (window.CR_EN = window.CR_EN || {})[0] = {
    "0-1": {
      goal: "Understand what flows in a wire, what pushes it, and how to measure both.",
      demo: [
        { t: "It all starts with [[charge|electric charge]]. Matter can carry a positive (+) or a negative (−) charge. Tap the balls: opposite charges attract, like charges repel." },
        { t: "Inside a metal there are free [[electron|electrons]]. When they move together along the wire, an [[current|electric current]] is created. [[voltage|Voltage]] is the \"push\" between the positive and the negative side. Move the voltage and watch the particles speed up." },
        { t: "The [[ammeter|ammeter]] (the circle with an A) sits inside the path, so all the current passes through it. The [[voltmeter|voltmeter]] (the circle with a V) is connected across the two sides and measures the push between them." },
        { t: "An important convention: [[conventional_current|conventional current]] is drawn from (+) to (−), even though the electrons themselves move the other way. Tap the button to switch views." },
        { t: "Electrical values can be very small. That is why we use [[si_prefix|prefixes]]: m (milli) = a thousandth, µ (micro) = a millionth. 0.005 A is 5 mA. Move the slider and watch the prefix change." },
      ],
      guided: [
        { t: "Increase the voltage until the [[ammeter|ammeter]] shows 6 mA.", hint: "The current rises together with the voltage. Try around the middle of the slider.", ok: "A bigger voltage pushes more charge every second, so the current grows." },
        { t: "Switch to the [[electron|electron]] view. Which way do they move?", hint: "Tap the button under the diagram.", ok: "Electrons move from (−) to (+), opposite to the [[conventional_current|conventional current]]." },
        { t: "Arrange the two [[charge|charges]] so that they repel each other.", hint: "Like charges repel. Tap a ball to flip its sign.", ok: "Two like charges (both + or both −) always repel." },
        { t: "Move the slider until a current of 4.7 mA is shown.", hint: "4.7 mA is 0.0047 A. Look for the m row in the table.", ok: "4.7 mA = 0.0047 A. The prefix saves writing zeros." },
      ],
      challenge: { t: "An [[ammeter|ammeter]] shows 0.025 A. How much is that in mA?" },
      quiz: [
        { q: "What happens to two negative charges close together?", o: ["They attract", "They repel", "Nothing happens"], x: "Like charges repel." },
        { q: "What makes an electric current in a metal?", o: ["Moving electrons", "Heat", "The colour of the wire"], x: "Current is moving charge, and in a metal the charge that moves is the electrons." },
        { q: "How is an ammeter connected?", o: ["Across two points, from outside", "Inside the path, so the current passes through it", "It does not matter"], x: "An ammeter must sit inside the path, like a water meter in a pipe." },
        { q: "In the conventional current direction, current flows…", o: ["from (−) to (+)", "from (+) to (−)", "in both directions"], x: "The convention: from (+) to (−), opposite to the electron movement." },
        { q: "How much is 2 mA in amperes?", o: ["0.2 A", "0.02 A", "0.002 A"], x: "m = a thousandth: 2 mA = 2/1000 A = 0.002 A." },
      ],
    },
    "0-2": {
      goal: "Build a closed circuit, and understand switch, open circuit, short circuit, node and ground.",
      demo: [
        { t: "A [[voltage_source|voltage source]], such as a battery, has two [[terminal|terminals]]: positive (+) and negative (−). It keeps a constant voltage between them." },
        { t: "The [[lamp|lamp]] is a [[load|load]]: it draws electricity from the source and turns it into light. Raise the voltage and watch it glow brighter." },
        { t: "Current flows only in a [[circuit|closed circuit]]: a continuous path from the positive terminal, through the load, and back to the negative terminal. The [[switch|switch]] opens and closes the path. Tap it." },
        { t: "When the switch is open there is an [[open_circuit|open circuit]]: no current, but the voltmeter shows the full source voltage across the break." },
        { t: "A [[short_circuit|short circuit]] is a direct wire with no component in between. Tap the short switch: the source current jumps, and the lamp goes out because the current bypasses it." },
        { t: "A [[node|node]] is a point where components connect. Every point of a node has the same voltage. Voltages are measured relative to [[ground|ground]], the node defined as 0 V." },
      ],
      guided: [
        { t: "Close the [[switch|switch]] and light the [[lamp|lamp]].", hint: "Tap switch S1 in the diagram.", ok: "The path is closed, current flows and the lamp is on." },
        { t: "Open the switch and check what the voltmeter across it shows.", hint: "Tap the switch again.", ok: "In an [[open_circuit|open circuit]] the current is zero, but the full source voltage appears across the break." },
        { t: "Close the switch to get the lamp back on, then also close the short switch.", hint: "First S1, then the short switch on the right.", ok: "[[short_circuit|Short circuit]]: the current bypasses the lamp, and the source current jumped to a high, dangerous value." },
        { t: "Check the [[node|node]] voltages: the top node is at 9 V and the bottom one at 0 V. Open and close the switch and see what changes.", hint: "Tap S1 twice.", ok: "Voltages are always measured relative to [[ground|ground]]." },
      ],
      challenge: { t: "Light the lamp without any [[short_circuit|short circuit]] in the circuit." },
      quiz: [
        { q: "Why is the lamp off when the switch is open?", o: ["Because the source has no voltage", "Because there is no closed path for the current", "Because the lamp is broken"], x: "Current flows only in a closed circuit." },
        { q: "What does a voltmeter across an open switch show?", o: ["0 V", "The full source voltage", "Half the voltage"], x: "In an open circuit there is no current, but all the voltage is across the break." },
        { q: "What happens in a short circuit?", o: ["The current drops to zero", "The current rises sharply", "The source voltage doubles"], x: "With nothing limiting it, the current jumps and can cause damage." },
        { q: "What is the voltage of ground?", o: ["0 V, by definition", "Always 9 V", "It depends on the weather"], x: "Ground is the reference point: 0 V." },
        { q: "What is a load?", o: ["A component that draws electricity from the source", "A long wire", "The battery voltage"], x: "A load uses electricity and does something with it, like a lamp." },
      ],
    },
    "0-3": {
      goal: "Understand resistance, the resistor, and Ohm's law V = I·R.",
      demo: [
        { t: "[[resistance|Resistance]] is how much a material \"opposes\" the flow of current, like a narrow pipe versus a wide one. Increase the resistance and watch the current drop." },
        { t: "A [[resistor|resistor]] is a component with a known resistance, measured in ohms (Ω). It is used to limit current." },
        { t: "[[ohms_law|Ohm's law]]: V = I·R. More voltage → more current. More resistance → less current. Check it: I = V / R." },
      ],
      guided: [
        { t: "Set V = 10 V and R = 1 kΩ. What is the current?", hint: "Move both sliders. 1 kΩ = 1000 Ω.", ok: "I = V/R = 10 / 1000 = 0.01 A = 10 mA." },
        { t: "Now double R to 2 kΩ. What happened to the current?", hint: "Move only the resistance slider.", ok: "Double the resistance → half the current: 5 mA." },
        { t: "Find R so that the current is 2 mA, with the voltage at 10 V.", hint: "R = V / I = 10 / 0.002.", ok: "R = 10 / 0.002 = 5000 Ω = 5 kΩ." },
      ],
      challenge: { t: "The voltage is 12 V. Set R so that the current is 3 mA. The ammeter is hidden, so calculate using [[ohms_law|Ohm's law]] and tap \"Check\"." },
      quiz: [
        { q: "By Ohm's law, what is the current when V = 6 V and R = 2 kΩ?", o: ["3 mA", "12 mA", "0.3 mA"], x: "I = 6 / 2000 = 0.003 A = 3 mA." },
        { q: "What happens to the current when the resistance increases (constant voltage)?", o: ["It grows", "It shrinks", "It does not change"], x: "I = V/R: larger R → smaller I." },
        { q: "What is the unit of resistance?", o: ["Volt (V)", "Ampere (A)", "Ohm (Ω)"], x: "Resistance is measured in ohms." },
        { q: "A current of 2 mA flows in a 5 kΩ resistor. What is the voltage across it?", o: ["10 V", "2.5 V", "7 V"], x: "V = I·R = 0.002 · 5000 = 10 V." },
        { q: "What is a resistor used for?", o: ["To limit current", "To produce voltage", "To store light"], x: "A resistor limits the current in the circuit." },
      ],
    },
    "0-4": {
      goal: "Understand power (how fast energy is used) and energy (how much is used in total).",
      demo: [
        { t: "[[power|Power]] is the rate of energy use: P = V·I, in watts (W). The higher the power, the brighter the lamp." },
        { t: "[[energy|Energy]] is power multiplied by time: E = P·t, in joules (J). Watch the counter add up as long as the lamp is on." },
      ],
      guided: [
        { t: "Set the voltage so that the lamp uses a power of 1 W.", hint: "P = V·I. Try a voltage around half of the scale.", ok: "At 6 V a current of 1/6 A flows, and P = 6 · 1/6 = 1 W." },
        { t: "Raise it to 12 V. How many times did the power grow?", hint: "Move the slider to the end.", ok: "Four times! Double the voltage also doubles the current, so P = V·I grows 2·2." },
        { t: "Reset the counter and let the lamp collect 20 J of energy.", hint: "Tap \"Reset\" and wait a few seconds. At 4 W it takes 5 seconds.", ok: "E = P·t: 4 W for 5 s = 20 J." },
      ],
      challenge: { t: "A current of 0.2 A flows in a 100 Ω resistor. What is the [[power|power]] in watts?", hint: "P = V·I, and by Ohm's law V = I·R." },
      quiz: [
        { q: "What is the formula for power?", o: ["P = V·I", "P = V/I", "P = V + I"], x: "Power = voltage times current." },
        { q: "A 12 V source supplies 0.5 A. What is the power?", o: ["24 W", "6 W", "12.5 W"], x: "P = 12 · 0.5 = 6 W." },
        { q: "What is the unit of energy?", o: ["Watt (W)", "Joule (J)", "Ohm (Ω)"], x: "Energy is measured in joules; power in watts." },
        { q: "A 10 W lamp is on for 3 seconds. How much energy did it use?", o: ["30 J", "3.3 J", "13 J"], x: "E = P·t = 10 · 3 = 30 J." },
        { q: "Where does the power in a resistor go?", o: ["It becomes heat", "It goes back to the battery", "It disappears"], x: "In a resistor the electrical energy turns into heat." },
      ],
    },
    "0-5": {
      goal: "Connect components in series and in parallel, and meet Kirchhoff's two laws.",
      demo: [
        { t: "In a [[series|series connection]] the components are one after another on a single path: the same current flows through all of them, and the resistances add: R = R1 + R2." },
        { t: "[[kvl|Kirchhoff's voltage law]]: the voltages across the components in the loop add up to the source voltage. Change the resistors: V1 + V2 stays 12 V." },
        { t: "In a [[parallel|parallel connection]] the components are connected to the same two nodes: they all have the same voltage, and the current splits between them." },
        { t: "[[kcl|Kirchhoff's current law]]: the current entering a node equals the current leaving it. Total current = I1 + I2." },
      ],
      guided: [
        { t: "Change R2 a few times and check that V1 + V2 stays 12 V.", hint: "Move the R2 slider back and forth.", ok: "Whatever the resistors are, the voltages add up to the source voltage." },
        { t: "Set R2 so that its voltage equals the voltage across R1.", hint: "When the resistors are equal, the voltage splits equally.", ok: "Equal resistors in series → each one gets half the voltage." },
        { t: "In the parallel connection: set R2 so that its current is half the current in R1.", hint: "Same voltage on both, so double the resistance → half the current.", ok: "R2 = 2·R1, so I2 = I1/2." },
        { t: "Change R1 and check that the total current always equals I1 + I2.", hint: "Move the R1 slider.", ok: "That is [[kcl|Kirchhoff's current law]]: charge does not disappear at a node." },
      ],
      challenge: { t: "R1 = 2 kΩ and R2 = 3 kΩ are connected in [[series|series]]. What is the equivalent resistance, in kilo-ohms?" },
      quiz: [
        { q: "In a series connection, what is the same in every component?", o: ["The voltage", "The current", "The power"], x: "On a single path the same current flows through all of them." },
        { q: "In a parallel connection, what is the same in every branch?", o: ["The voltage", "The current", "The resistance"], x: "All the branches connect to the same two nodes, so they share the same voltage." },
        { q: "A 9 V source, and one series resistor has 4 V across it. How much is across the other?", o: ["4 V", "5 V", "13 V"], x: "By KVL: 9 − 4 = 5 V." },
        { q: "10 mA enters a node. 6 mA leaves through one branch. How much in the other?", o: ["4 mA", "16 mA", "6 mA"], x: "By KCL: 10 − 6 = 4 mA." },
        { q: "What happens to the total current when you add another branch in parallel?", o: ["It grows", "It shrinks", "It does not change"], x: "Another branch = another path for current, so the total current grows." },
      ],
    },
    "0-6": {
      goal: "Build a voltage divider and control a voltage with a potentiometer.",
      demo: [
        { t: "A [[voltage_divider|voltage divider]]: two resistors in series. The voltage at the node between them is a fixed fraction of the source voltage: V_out = V_in·R2/(R1+R2)." },
        { t: "A [[potentiometer|potentiometer]] is an adjustable voltage divider: a resistor with a moving wiper. Move the wiper and its voltage changes between 0 and 12 V." },
      ],
      guided: [
        { t: "Set the resistors so that V_out is half of V_in.", hint: "Equal resistors → half.", ok: "R1 = R2 → V_out = 12 · ½ = 6 V." },
        { t: "Now set V_out = 3 V.", hint: "You need R2/(R1+R2) = ¼, that is R1 = 3·R2.", ok: "For example R1 = 30 kΩ and R2 = 10 kΩ: 12 · 10/40 = 3 V." },
        { t: "Move the potentiometer wiper until its voltage is 9 V.", hint: "9 V is ¾ of 12 V.", ok: "Wiper at 75% → 75% of the voltage: 9 V." },
      ],
      challenge: { t: "V_in = 12 V and R1 = 10 kΩ is fixed. Choose R2 so that V_out = 4 V. The voltage is hidden, so calculate and tap \"Check\"." },
      quiz: [
        { q: "R1 = R2 in a 10 V voltage divider. What is V_out?", o: ["10 V", "5 V", "2.5 V"], x: "Equal resistors → the voltage splits half and half." },
        { q: "What happens to V_out when R2 increases (R1 fixed)?", o: ["It rises", "It falls", "It does not change"], x: "V_out = V_in·R2/(R1+R2): R2 grows → its share grows." },
        { q: "What is a potentiometer?", o: ["An adjustable voltage divider", "A small battery", "An ammeter"], x: "A resistor with a moving wiper that changes the output voltage." },
        { q: "V_in = 12 V, R1 = 20 kΩ, R2 = 10 kΩ. What is V_out?", o: ["4 V", "8 V", "6 V"], x: "12 · 10/30 = 4 V." },
        { q: "The wiper of a potentiometer on 12 V is at 25%. What is its voltage?", o: ["3 V", "9 V", "25 V"], x: "25% of 12 V = 3 V." },
      ],
    },
  };
})();
