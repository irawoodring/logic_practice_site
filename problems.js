// =====================================================================
//  PROBLEMS: edit this file to add, remove, or reorder problems.
// =====================================================================
//
//  Everything between the two backticks (`) is plain text:
//
//    # Set title              starts a new problem set
//    rules: MP, MT            rules allowed in the set (leave out = all rules)
//    note: some text          optional instructions shown above the set
//    P > Q, P / Q             one problem per line: premises / conclusion
//    // a comment             ignored
//
//  Rule names: MP MT HS DS CD Simp Conj Add
//              DM Com Assoc Dist DN Trans Impl Equiv Exp Taut
//              CP IP
//  Shortcuts:  implication (the first 8), replacement (the next 10), all
//
//  Symbols: type either the keyboard version or the real symbol.
//    not  ~        and  &  .  •        or   v  ∨
//    if-then  >  ->  ⊃                 iff  =  <->  ≡
//  Use capital letters for statements and parentheses for grouping:
//    (A v B) > ~C
//
//  A problem with no premises (a theorem) starts with the slash:  / P > P
//
//  After saving, refresh the page. Typos and invalid arguments (ones
//  that can't be proved) are flagged with a ⚠ in the problem list.
// =====================================================================

window.PROBLEMS = String.raw`

# 1. Modus Ponens & Modus Tollens
rules: MP, MT
note: Use MP (p ⊃ q, p ∴ q) and MT (p ⊃ q, ~q ∴ ~p).
P > Q, P / Q
P > Q, ~Q / ~P
P > (Q > R), P, Q / R
~A > (B > C), ~A, ~C / ~B
(G > H) > K, ~K, ~(G > H) > M / M
F > (G > H), ~H, F, J > G / ~J

# 2. Hypothetical & Disjunctive Syllogism
rules: MP, MT, HS, DS
A > B, B > C / A > C
A v B, ~A / B
(P v Q) > R, R > S, ~S / ~(P v Q)
~M v N, ~~M, N > O / O
J > K, K > L, ~L, J v M / M
C v (A > B), ~C, B > D, ~D / ~A

# 3. All Rules of Implication
rules: implication
P . Q / P
P, Q / P . Q
P / P v Q
(A > B) . (C > D), A v C / B v D
(K > L) . M, K / L
A > B, C > D, A / B v D
E > F, G > H, E v G / F v H
M > N, M, O, N > P / P . O

# 4. Replacement Rules I
rules: implication, DM, Com, Assoc, Dist, DN
note: Replacement rules can be applied to part of a line, and in either direction.
~(A v B) / ~A
P . Q / Q
~~P > Q, P / Q
(A v B) v C, ~A / B v C
A . (B v C), ~(A . B) / A . C
~(P . Q), P / ~Q
~(J v K) > L, ~L / J v K
(R v S) . (R v T), ~R / S . T

# 5. Replacement Rules II
rules: implication, replacement
A > B / ~B > ~A
~P v Q, P / Q
P = Q, P / Q
(A . B) > C, A, B / C
P v P / P
P > ~P / ~P
A > (B > C) / B > (A > C)
~(P > Q) / P
(P > Q) . (~P > Q) / Q

# 6. Conditional Proof
rules: all
note: Start a subproof with an assumption (ACP), then close it with "first-last CP".
P > Q, Q > R / P > R
A > B / A > (A . B)
(A v B) > C / A > C
A > (B > C), B / A > C
(P . Q) > R / P > (Q > R)
P > (Q . R) / (P > Q) . (P > R)

# 7. Indirect Proof
rules: all
note: Assume the opposite (AIP), reach a contradiction q • ~q, then close with "first-last IP".
P > Q, P > ~Q / ~P
A v B, ~B / A
(P v Q) > R, ~R / ~P
P > (Q . ~Q) / ~P

# 8. Theorems
rules: all
note: No premises! Start with an assumption.
/ P > P
/ P > (Q > P)
/ (P > Q) > (~Q > ~P)
/ ~(P . ~P)
/ P v ~P

`;
