# ADMPHONE — page d'accueil

Landing page éditoriale pour ADMPHONE, réparateur d'iPhone. HTML/CSS/JS statique,
sans build, sans dépendance réseau.

## Lancer le site

**Il faut le servir en HTTP.** En `file://` (double-clic sur `index.html`), Chrome
considère toute image locale comme « cross-origin » et refuse de la charger en
texture WebGL : la galerie bascule alors sur un fondu CSS, et l'effet signature
est perdu. Le reste de la page fonctionne normalement.

```bash
cd /chemin/vers/le/projet
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Structure

```
index.html                  page unique, 9 sections
assets/css/site.css         charte, grille, états de mouvement réduit
assets/js/main.js           partition GSAP + Lenis (défilement inertiel)
assets/js/gl.js             vignettes WebGL avant/après (chargé à la demande)
assets/img/*.jpg            14 plans studio
assets/vendor/              GSAP 3.15, ScrollTrigger, SplitText, Lenis 1.3, Three.js 0.186
```

Three.js est un bundle allégé (esbuild, 519 ko) ne contenant que le rendu utilisé.
Il n'est téléchargé que lorsque la galerie approche de l'écran, et seulement si le
WebGL est disponible et le mouvement autorisé.

## Charte

Palette Apple : encre `#1d1d1f`, papier `#f5f5f7`, bleu `#0071e3`, gris secondaire
`#6e6e73` (fond clair) et `#86868b` (fond sombre et display). Typographie : pile
système Apple — SF Pro rend nativement sur Apple, Helvetica ailleurs. Aucune police
distante, donc aucun chargement bloquant.

Tous les tokens sont en haut de `site.css`.

## Mouvement

Défilement inertiel (Lenis), parallaxe sur le héros et l'atelier, révélations par
`clip-path`, section produits épinglée, masques de ligne sur les titres, bandeau
déformé par la vélocité du défilement, folio de marge qui suit la lecture,
compteurs, et transition WebGL avant/après au survol des vignettes.

Sous `prefers-reduced-motion: reduce`, tout est rendu dans son état final : pas de
défilement inertiel, pas d'épinglage, pas de WebGL, chiffres écrits d'emblée.

## À remplacer avant mise en ligne

Le contenu est un gabarit. Ces éléments sont **fictifs** et doivent être remplacés
par les vôtres :

- **Images** — les 14 plans sont des rendus vectoriels en lumière studio, pas des
  photographies. Remplacez les fichiers de `assets/img/` en gardant les mêmes noms
  et formats (héros 2400×1500, produits et atelier 1600×2000, vignettes 1200×1500).
  Le site est conçu pour vos vraies photos d'atelier : elles vaudront mieux.
- **Témoignages** — les trois avis de la section « Avis » sont des exemples.
- **Coordonnées** — adresse, horaires, téléphone `04 00 00 00 00`, e-mail
  `bonjour@admphone.fr`.
- **Tarifs et délais** — les prix et durées des sections « Produits » et « Services ».
- **Mention « Centre de service agréé Apple »** — à ne conserver que si le statut
  est effectivement détenu ; c'est une allégation encadrée. Le pied de page contient
  déjà la mention de marques et la précision d'indépendance.

## Formulaire de devis

La validation est côté client uniquement : rien n'est envoyé. Pour le brancher,
remplacez le corps de `initForm()` dans `main.js` par un `fetch` vers votre service
(Formspree, Basin, une fonction Vercel…), en conservant la vérification des champs
et les messages d'état.
