/// <reference path="../pb_data/types.d.ts" />
// Loans for anyone who goes broke wagering (Tetrafatalis betting): a Pact
// with Beyelzebub (lender empty) or a Pledge from another person.
//   loans.borrower / lender  — people; lender empty = Beyelzebub
//   loans.borrowerName / lenderName — names kept, like bets.who, so an
//                              archived tournament still reads after sign-ins
//                              are cleared
//   loans.amount             — gold lent
//   loans.rate, loans.capMult — the cut of each winning wager's profit, and
//                              how many times the amount the lender gets back
//                              (Pact 0.5 / 2, Pledge 0.25 / 1.5): kept on the
//                              loan so a rule change never rewrites old loans
//   loans.status             — requested (a Pledge awaiting the lender),
//                              active, declined, cancelled
//   loans.activeAt           — when it became active (repayments come from
//                              wagers placed after this)
// Nothing about repayment is stored: like balances, it's worked out from the
// wagers and results every time (lib/loans.ts). Public read; only the web
// server writes (as the bookie), after checking. Goes with the tournament.
migrate(
  (app) => {
    const tournaments = app.findCollectionByNameOrId("tournaments");
    const people = app.findCollectionByNameOrId("people");
    const loans = new Collection({
      type: "base",
      name: "loans",
      listRule: "",
      viewRule: "",
      fields: [
        { name: "tournament", type: "relation", required: true, collectionId: tournaments.id, maxSelect: 1, cascadeDelete: true },
        { name: "borrower", type: "relation", collectionId: people.id, maxSelect: 1, cascadeDelete: false },
        { name: "lender", type: "relation", collectionId: people.id, maxSelect: 1, cascadeDelete: false },
        { name: "borrowerName", type: "text", max: 16 },
        { name: "lenderName", type: "text", max: 16 },
        { name: "amount", type: "number", required: true, min: 1, onlyInt: true },
        { name: "rate", type: "number", required: true, min: 0, max: 1 },
        { name: "capMult", type: "number", required: true, min: 1 },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["requested", "active", "declined", "cancelled"] },
        { name: "activeAt", type: "text", max: 40 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
    });
    app.save(loans);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("loans"));
    } catch (_) {
      /* already gone */
    }
  },
);
