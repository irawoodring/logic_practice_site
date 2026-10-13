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
//  Truth-table sets: add the line "type: truth table". Then each line is
//    P > (Q > P)              one statement (tautologous, contingent, ...)
//    P > Q, ~Q > ~P           statements to compare (equivalent, consistent, ...)
//    P > Q, Q / P             an argument (valid or invalid)
//  Add "columns: main" to have students fill in only each statement's
//  main column instead of every part.
//
//  Rule names: MP MT HS DS CD Simp Conj Add
//              DM Com Assoc Dist DN Trans Impl Equiv Exp Taut
//              UI UG EI EG QN
//              CP IP
//  Shortcuts:  implication (the first 8), replacement (the next 10),
//              quantifier (UI UG EI EG QN), all
//
//  Symbols: type either the keyboard version or the real symbol.
//    not  ~        and  &  .  •        or   v  ∨
//    if-then  >  ->  ⊃                 iff  =  <->  ≡
//  Use capital letters for statements and parentheses for grouping:
//    (A v B) > ~C
//
//  Predicate logic: a capital letter followed by lowercase letters, like
//  Fa or Lxy. a-w (except v) name individuals; x, y, z are variables.
//    for all x: (x)          there exists an x: (Ex) or (∃x)
//    (x)(Hx > Mx), Hs / Ms
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

# 9. Truth Tables: Statements
type: truth table
note: Fill in every column, then classify the statement.
P > (Q > P)
(P > Q) . (P . ~Q)
(P v Q) > P
~(P . Q) = (~P v ~Q)
(P > Q) > (~P > ~Q)
(P . Q) v (~P . ~Q)

# 10. Truth Tables: Comparing Statements
type: truth table
note: If a pair is logically equivalent or contradictory, choose that. Otherwise choose consistent or inconsistent.
P > Q, ~Q > ~P
P . Q, ~P v ~Q
P v Q, ~P . Q
P . Q, ~P . ~Q
P = Q, (P . ~Q) v (~P . Q)
P v Q, ~P, ~Q

# 11. Truth Tables: Arguments
type: truth table
note: An argument is invalid if some row makes every premise true and the conclusion false.
P > Q, Q / P
P > Q, ~Q / ~P
P v Q, P / ~Q
(P . Q) > R, ~R / ~P v ~Q
P > Q, Q > R / R > P

# 12. Quantifiers: UI, UG, EI, EG
rules: all
note: Type (x) for "for all x" and (Ex) or the ∃ button for "there exists an x". Lowercase a-w name individuals; x, y, z are variables.
(x)(Ax > Bx), Aa / Ba
(x)(Ax > Bx), (x)(Bx > Cx) / (x)(Ax > Cx)
(x)(Fx > Gx), (Ex)Fx / (Ex)Gx
(x)(Hx > Ix), (Ex)(Hx . Jx) / (Ex)(Ix . Jx)
(x)(Px > ~Qx), (x)(Rx > Qx) / (x)(Rx > ~Px)
(x)Fx / (Ex)Fx

# 13. Quantifier Negation
rules: all
~(Ex)Fx / (x)~Fx
~(x)(Fx > Gx) / (Ex)(Fx . ~Gx)
(x)(Ax > Bx), ~(x)Bx / ~(x)Ax
(Ex)Fx > (x)Gx, ~Gm / (x)~Fx

# 14. Quantifiers with CP and IP
rules: all
(x)(Ax > Bx) / (x)Ax > (x)Bx
(x)(Fx > Gx) / (Ex)Fx > (Ex)Gx
(x)(Fx > Gx), (x)(Fx > ~Gx) / (x)~Fx

# 15. Relational Predicates
rules: all
note: Predicates can relate several things: Lab means "a loves b".
(x)(y)Lxy / Lab
(Ex)(y)Lxy / (y)(Ex)Lxy
(x)(Fx > (y)Gxy), Fa / Gab
(x)(y)(Lxy > Lyx), Lab / Lba

`;
