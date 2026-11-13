<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { gold, type BettorBook } from "$lib/betting";
  import { isBroke, loanOf, PACT, PLEDGE, type PBLoan } from "$lib/loans";
  import { START_BALANCE } from "$lib/odds";
  import type { Me } from "$lib/people";
  import { WAGERS } from "$lib/terms";

  // Loans on the phone (lib/loans.ts): Pledge requests sent to you, and when
  // you're broke, a Pact with Beyelzebub or a Pledge from another bettor.
  // The server (/live/loan) checks every step; this only shows and asks.
  let {
    me,
    mine,
    all,
    loans,
    onlost,
  }: {
    me: Me;
    mine: BettorBook;
    all: BettorBook[]; // everyone's wallets, for who can lend
    loans: PBLoan[];
    onlost: () => void;
  } = $props();

  const status = $derived(loanOf(me.id, loans));
  const broke = $derived(isBroke(mine));
  // Anyone who has had a loan today is out once broke again.
  const hadLoan = $derived(!!status.active);
  let amount = $state(5000);
  let lender = $state("");
  let busy = $state(false);
  let problem = $state("");

  // Who could lend that much (not you), richest first.
  const lenders = $derived(
    all
      .filter((b) => b.bettor.id !== me.id && !b.bettor.id.startsWith("gone:") && b.balance >= amount)
      .sort((a, b) => b.balance - a.balance),
  );
  const nameOf = (id: string) => all.find((b) => b.bettor.id === id)?.bettor.name ?? "?";

  async function send(body: Record<string, unknown>) {
    busy = true;
    problem = "";
    try {
      const res = await fetch("/live/loan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: me.id, token: me.token, ...body }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.status === 410) onlost();
      else if (!res.ok) problem = out.message ?? "That didn't work. Try again.";
      else await invalidateAll();
    } catch {
      problem = "No connection. Try again.";
    } finally {
      busy = false;
    }
  }
</script>

<!-- Pledge requests other bettors have sent you. -->
{#each status.asked as l (l.id)}
  <section class="lv-slab ask" aria-label="A loan request">
    <p>
      <b>{nameOf(l.borrower)}</b> asks you for a {WAGERS.playerLoan} of <b>{gold(l.amount)}</b>. You'd get back
      {Math.round(l.rate * 100)}% of their winnings until you've had {gold(Math.round(l.amount * l.capMult))}. If they go broke again,
      you lose it.
    </p>
    <div class="row">
      <button class="go" disabled={busy} onclick={() => send({ action: "accept", loan: l.id })}>Lend it</button>
      <button class="plain" disabled={busy} onclick={() => send({ action: "decline", loan: l.id })}>No thanks</button>
    </div>
  </section>
{/each}

{#if status.waiting}
  <section class="lv-slab ask" aria-label="Your loan request">
    <p>
      You asked <b>{nameOf(status.waiting.lender)}</b> for <b>{gold(status.waiting.amount)}</b>. Waiting for them to answer…
    </p>
    <div class="row">
      <button class="plain" disabled={busy} onclick={() => send({ action: "cancel", loan: status.waiting!.id })}>Cancel the request</button>
    </div>
  </section>
{:else if broke && hadLoan}
  <section class="lv-slab out">
    <p>You're out of gold, and you've had your one loan for today. Thanks for playing!</p>
  </section>
{:else if broke}
  <section class="lv-slab borrow" aria-label="Borrow gold">
    <header class="lv-slab-head"><h2>Out of gold?</h2></header>
    <div class="body">
      <label for="loan-amount">Borrow</label>
      <div class="amounts">
        {#each [2000, 5000, START_BALANCE] as a (a)}
          <button class="chip" class:on={amount === a} onclick={() => (amount = a)}>{a.toLocaleString("en-IE")}</button>
        {/each}
        <input id="loan-amount" type="number" min="1" max={START_BALANCE} step="100" bind:value={amount} aria-label="Amount to borrow" />
      </div>

      <div class="option pact">
        <h3>A {WAGERS.demonLoan} with {WAGERS.demonLender}</h3>
        <p>
          He's always willing. He takes {PACT.rate * 100}% of every win until he's had {gold(Math.round((amount || 0) * PACT.capMult))}
          back.
        </p>
        <button class="go demon" disabled={busy || !(amount > 0)} onclick={() => send({ action: "request", lender: "", amount })}>
          Seal the {WAGERS.demonLoan}
        </button>
      </div>

      <div class="option">
        <h3>A {WAGERS.playerLoan} from another bettor</h3>
        <p>
          Kinder terms: {PLEDGE.rate * 100}% of every win until they've had {gold(Math.round((amount || 0) * PLEDGE.capMult))} back. They
          have to say yes.
        </p>
        {#if lenders.length}
          <select bind:value={lender} aria-label="Who to ask">
            <option value="">Who to ask…</option>
            {#each lenders as b (b.bettor.id)}
              <option value={b.bettor.id}>{b.bettor.name} ({gold(b.balance)})</option>
            {/each}
          </select>
          <button class="go" disabled={busy || !lender} onclick={() => send({ action: "request", lender, amount })}>Ask them</button>
        {:else}
          <p class="none">Nobody has that much to lend right now.</p>
        {/if}
      </div>
    </div>
  </section>
{/if}

{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

<style>
  .ask,
  .out {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ask {
    border-color: var(--red);
    box-shadow: 0 2px 0 rgba(90, 58, 12, 0.25);
  }
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  label,
  h3 {
    font-stretch: 75%;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.85rem;
  }
  /* Three presets across, the typed amount on its own row under them. */
  .amounts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .amounts input {
    grid-column: 1 / -1;
  }
  .chip,
  input,
  select {
    min-height: 44px;
    min-width: 0;
    font: inherit;
    font-weight: 700;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    padding: 0 8px;
  }
  .chip.on {
    background: var(--ink);
    color: var(--paper);
  }
  .option {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid rgb(0 0 0 / 0.12);
  }
  .pact h3 {
    color: var(--red);
  }
  .go,
  .plain {
    min-height: 48px;
    padding: 0 14px;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1.15rem;
    text-transform: uppercase;
    border: 2px solid var(--ink);
    cursor: pointer;
  }
  .go {
    background: var(--gold);
    color: var(--ink);
    box-shadow: 0 2px 0 rgba(90, 58, 12, 0.25);
  }
  /* Demon crimson only for danger moments (planning doc, art direction). */
  .go.demon {
    background: var(--red);
    color: var(--paper);
  }
  .plain {
    background: var(--paper);
    color: var(--ink);
  }
  .go:disabled,
  .plain:disabled {
    opacity: 0.6;
  }
  .none {
    color: var(--ink-soft);
  }
  .problem {
    color: var(--paper);
    background: var(--red);
    font-weight: 700;
    padding: 8px 10px;
    border: 2px solid var(--ink);
  }
</style>
