// Sample solutions, keyed by the problem as the checker prints it.
// Each step is [statement, justification]. Optional: problems without a
// solution here are still checked for typos and validity.
module.exports = {
  // 1. MP & MT
  'P ⊃ Q, P / Q': [['Q', '1, 2 MP']],
  'P ⊃ Q, ~Q / ~P': [['~P', '1, 2 MT']],
  'P ⊃ (Q ⊃ R), P, Q / R': [['Q > R', '1, 2 MP'], ['R', '4, 3 MP']],
  '~A ⊃ (B ⊃ C), ~A, ~C / ~B': [['B > C', '1, 2 MP'], ['~B', '4, 3 MT']],
  '(G ⊃ H) ⊃ K, ~K, ~(G ⊃ H) ⊃ M / M': [['~(G > H)', '1, 2 MT'], ['M', '3, 4 MP']],
  'F ⊃ (G ⊃ H), ~H, F, J ⊃ G / ~J': [['G > H', '1, 3 MP'], ['~G', '5, 2 MT'], ['~J', '4, 6 MT']],

  // 2. HS & DS
  'A ⊃ B, B ⊃ C / A ⊃ C': [['A > C', '1, 2 HS']],
  'A ∨ B, ~A / B': [['B', '1, 2 DS']],
  '(P ∨ Q) ⊃ R, R ⊃ S, ~S / ~(P ∨ Q)': [['(P v Q) > S', '1, 2 HS'], ['~(P v Q)', '4, 3 MT']],
  '~M ∨ N, ~~M, N ⊃ O / O': [['N', '1, 2 DS'], ['O', '3, 4 MP']],
  'J ⊃ K, K ⊃ L, ~L, J ∨ M / M': [['J > L', '1, 2 HS'], ['~J', '5, 3 MT'], ['M', '4, 6 DS']],
  'C ∨ (A ⊃ B), ~C, B ⊃ D, ~D / ~A': [['A > B', '1, 2 DS'], ['A > D', '5, 3 HS'], ['~A', '6, 4 MT']],

  // 3. Implication
  'P • Q / P': [['P', '1 Simp']],
  'P, Q / P • Q': [['P . Q', '1, 2 Conj']],
  'P / P ∨ Q': [['P v Q', '1 Add']],
  '(A ⊃ B) • (C ⊃ D), A ∨ C / B ∨ D': [['B v D', '1, 2 CD']],
  '(K ⊃ L) • M, K / L': [['K > L', '1 Simp'], ['L', '3, 2 MP']],
  'A ⊃ B, C ⊃ D, A / B ∨ D': [['B', '1, 3 MP'], ['B v D', '4 Add']],
  'E ⊃ F, G ⊃ H, E ∨ G / F ∨ H': [['(E > F) . (G > H)', '1, 2 Conj'], ['F v H', '4, 3 CD']],
  'M ⊃ N, M, O, N ⊃ P / P • O': [['N', '1, 2 MP'], ['P', '4, 5 MP'], ['P . O', '6, 3 Conj']],

  // 4. Replacement I
  '~(A ∨ B) / ~A': [['~A . ~B', '1 DM'], ['~A', '2 Simp']],
  'P • Q / Q': [['Q . P', '1 Com'], ['Q', '2 Simp']],
  '~~P ⊃ Q, P / Q': [['~~P', '2 DN'], ['Q', '1, 3 MP']],
  '(A ∨ B) ∨ C, ~A / B ∨ C': [['A v (B v C)', '1 Assoc'], ['B v C', '3, 2 DS']],
  'A • (B ∨ C), ~(A • B) / A • C': [['(A . B) v (A . C)', '1 Dist'], ['A . C', '3, 2 DS']],
  '~(P • Q), P / ~Q': [['~P v ~Q', '1 DM'], ['~~P', '2 DN'], ['~Q', '3, 4 DS']],
  '~(J ∨ K) ⊃ L, ~L / J ∨ K': [['~~(J v K)', '1, 2 MT'], ['J v K', '3 DN']],
  '(R ∨ S) • (R ∨ T), ~R / S • T': [['R v (S . T)', '1 Dist'], ['S . T', '3, 2 DS']],

  // 5. Replacement II
  'A ⊃ B / ~B ⊃ ~A': [['~B > ~A', '1 Trans']],
  '~P ∨ Q, P / Q': [['P > Q', '1 Impl'], ['Q', '3, 2 MP']],
  'P ≡ Q, P / Q': [['(P > Q) . (Q > P)', '1 Equiv'], ['P > Q', '3 Simp'], ['Q', '4, 2 MP']],
  '(A • B) ⊃ C, A, B / C': [['A > (B > C)', '1 Exp'], ['B > C', '4, 2 MP'], ['C', '5, 3 MP']],
  'P ∨ P / P': [['P', '1 Taut']],
  'P ⊃ ~P / ~P': [['~P v ~P', '1 Impl'], ['~P', '2 Taut']],
  'A ⊃ (B ⊃ C) / B ⊃ (A ⊃ C)': [['(A . B) > C', '1 Exp'], ['(B . A) > C', '2 Com'], ['B > (A > C)', '3 Exp']],
  '~(P ⊃ Q) / P': [['~(~P v Q)', '1 Impl'], ['~~P . ~Q', '2 DM'], ['~~P', '3 Simp'], ['P', '4 DN']],
  '(P ⊃ Q) • (~P ⊃ Q) / Q': [
    ['P > Q', '1 Simp'], ['~Q > ~P', '2 Trans'], ['(~P > Q) . (P > Q)', '1 Com'], ['~P > Q', '4 Simp'],
    ['~Q > Q', '3, 5 HS'], ['~~Q v Q', '6 Impl'], ['Q v Q', '7 DN'], ['Q', '8 Taut'],
  ],

  // 6. CP
  'P ⊃ Q, Q ⊃ R / P ⊃ R': [['P', 'ACP'], ['Q', '1, 3 MP'], ['R', '2, 4 MP'], ['P > R', '3-5 CP']],
  'A ⊃ B / A ⊃ (A • B)': [['A', 'ACP'], ['B', '1, 2 MP'], ['A . B', '2, 3 Conj'], ['A > (A . B)', '2-4 CP']],
  '(A ∨ B) ⊃ C / A ⊃ C': [['A', 'ACP'], ['A v B', '2 Add'], ['C', '1, 3 MP'], ['A > C', '2-4 CP']],
  'A ⊃ (B ⊃ C), B / A ⊃ C': [['A', 'ACP'], ['B > C', '1, 3 MP'], ['C', '4, 2 MP'], ['A > C', '3-5 CP']],
  '(P • Q) ⊃ R / P ⊃ (Q ⊃ R)': [
    ['P', 'ACP'], ['Q', 'ACP'], ['P . Q', '2, 3 Conj'], ['R', '1, 4 MP'], ['Q > R', '3-5 CP'], ['P > (Q > R)', '2-6 CP'],
  ],
  'P ⊃ (Q • R) / (P ⊃ Q) • (P ⊃ R)': [
    ['P', 'ACP'], ['Q . R', '1, 2 MP'], ['Q', '3 Simp'], ['P > Q', '2-4 CP'],
    ['P', 'ACP'], ['Q . R', '1, 6 MP'], ['R . Q', '7 Com'], ['R', '8 Simp'], ['P > R', '6-9 CP'],
    ['(P > Q) . (P > R)', '5, 10 Conj'],
  ],

  // 7. IP
  'P ⊃ Q, P ⊃ ~Q / ~P': [['P', 'AIP'], ['Q', '1, 3 MP'], ['~Q', '2, 3 MP'], ['Q . ~Q', '4, 5 Conj'], ['~P', '3-6 IP']],
  'A ∨ B, ~B / A': [['~A', 'AIP'], ['B', '1, 3 DS'], ['B . ~B', '4, 2 Conj'], ['A', '3-5 IP']],
  '(P ∨ Q) ⊃ R, ~R / ~P': [['P', 'AIP'], ['P v Q', '3 Add'], ['R', '1, 4 MP'], ['R . ~R', '5, 2 Conj'], ['~P', '3-6 IP']],
  'P ⊃ (Q • ~Q) / ~P': [['P', 'AIP'], ['Q . ~Q', '1, 2 MP'], ['~P', '2-3 IP']],

  // 8. Theorems
  ' / P ⊃ P': [['P', 'ACP'], ['P > P', '1-1 CP']],
  ' / P ⊃ (Q ⊃ P)': [['P', 'ACP'], ['Q', 'ACP'], ['P . Q', '1, 2 Conj'], ['P', '3 Simp'], ['Q > P', '2-4 CP'], ['P > (Q > P)', '1-5 CP']],
  ' / (P ⊃ Q) ⊃ (~Q ⊃ ~P)': [['P > Q', 'ACP'], ['~Q > ~P', '1 Trans'], ['(P > Q) > (~Q > ~P)', '1-2 CP']],
  ' / ~(P • ~P)': [['P . ~P', 'AIP'], ['~(P . ~P)', '1-1 IP']],
  ' / P ∨ ~P': [['~(P v ~P)', 'AIP'], ['~P . ~~P', '1 DM'], ['P v ~P', '1-2 IP']],

  // 12. Quantifiers
  '(x)(Ax ⊃ Bx), Aa / Ba': [['Aa > Ba', '1 UI'], ['Ba', '3, 2 MP']],
  '(x)(Ax ⊃ Bx), (x)(Bx ⊃ Cx) / (x)(Ax ⊃ Cx)': [['Ax > Bx', '1 UI'], ['Bx > Cx', '2 UI'], ['Ax > Cx', '3, 4 HS'], ['(x)(Ax > Cx)', '5 UG']],
  '(x)(Fx ⊃ Gx), (∃x)Fx / (∃x)Gx': [['Fa', '2 EI'], ['Fa > Ga', '1 UI'], ['Ga', '4, 3 MP'], ['(Ex)Gx', '5 EG']],
  '(x)(Hx ⊃ Ix), (∃x)(Hx • Jx) / (∃x)(Ix • Jx)': [
    ['Ha . Ja', '2 EI'], ['Ha > Ia', '1 UI'], ['Ha', '3 Simp'], ['Ia', '4, 5 MP'], ['Ja . Ha', '3 Com'], ['Ja', '7 Simp'],
    ['Ia . Ja', '6, 8 Conj'], ['(Ex)(Ix . Jx)', '9 EG'],
  ],
  '(x)(Px ⊃ ~Qx), (x)(Rx ⊃ Qx) / (x)(Rx ⊃ ~Px)': [
    ['Px > ~Qx', '1 UI'], ['Rx > Qx', '2 UI'], ['~~Qx > ~Px', '3 Trans'], ['Qx > ~Px', '5 DN'], ['Rx > ~Px', '4, 6 HS'], ['(x)(Rx > ~Px)', '7 UG'],
  ],
  '(x)Fx / (∃x)Fx': [['Fa', '1 UI'], ['(Ex)Fx', '2 EG']],

  // 13. QN
  '~(∃x)Fx / (x)~Fx': [['(x)~Fx', '1 QN']],
  '~(x)(Fx ⊃ Gx) / (∃x)(Fx • ~Gx)': [
    ['(Ex)~(Fx > Gx)', '1 QN'], ['~(Fa > Ga)', '2 EI'], ['~(~Fa v Ga)', '3 Impl'], ['~~Fa . ~Ga', '4 DM'], ['Fa . ~Ga', '5 DN'], ['(Ex)(Fx . ~Gx)', '6 EG'],
  ],
  '(x)(Ax ⊃ Bx), ~(x)Bx / ~(x)Ax': [
    ['(Ex)~Bx', '2 QN'], ['~Ba', '3 EI'], ['Aa > Ba', '1 UI'], ['~Aa', '5, 4 MT'], ['(Ex)~Ax', '6 EG'], ['~(x)Ax', '7 QN'],
  ],
  '(∃x)Fx ⊃ (x)Gx, ~Gm / (x)~Fx': [['(Ex)~Gx', '2 EG'], ['~(x)Gx', '3 QN'], ['~(Ex)Fx', '1, 4 MT'], ['(x)~Fx', '5 QN']],

  // 14. Quantifiers with CP and IP
  '(x)(Ax ⊃ Bx) / (x)Ax ⊃ (x)Bx': [['(x)Ax', 'ACP'], ['Ax', '2 UI'], ['Ax > Bx', '1 UI'], ['Bx', '4, 3 MP'], ['(x)Bx', '5 UG'], ['(x)Ax > (x)Bx', '2-6 CP']],
  '(x)(Fx ⊃ Gx) / (∃x)Fx ⊃ (∃x)Gx': [['(Ex)Fx', 'ACP'], ['Fa', '2 EI'], ['Fa > Ga', '1 UI'], ['Ga', '4, 3 MP'], ['(Ex)Gx', '5 EG'], ['(Ex)Fx > (Ex)Gx', '2-6 CP']],
  '(x)(Fx ⊃ Gx), (x)(Fx ⊃ ~Gx) / (x)~Fx': [
    ['Fx', 'AIP'], ['Fx > Gx', '1 UI'], ['Fx > ~Gx', '2 UI'], ['Gx', '4, 3 MP'], ['~Gx', '5, 3 MP'], ['Gx . ~Gx', '6, 7 Conj'], ['~Fx', '3-8 IP'], ['(x)~Fx', '9 UG'],
  ],

  // 15. Relational
  '(x)(y)Lxy / Lab': [['(y)Lay', '1 UI'], ['Lab', '2 UI']],
  '(∃x)(y)Lxy / (y)(∃x)Lxy': [['(y)Lay', '1 EI'], ['Lay', '2 UI'], ['(Ex)Lxy', '3 EG'], ['(y)(Ex)Lxy', '4 UG']],
  '(x)(Fx ⊃ (y)Gxy), Fa / Gab': [['Fa > (y)Gay', '1 UI'], ['(y)Gay', '3, 2 MP'], ['Gab', '4 UI']],
  '(x)(y)(Lxy ⊃ Lyx), Lab / Lba': [['(y)(Lay > Lya)', '1 UI'], ['Lab > Lba', '3 UI'], ['Lba', '4, 2 MP']],
};
