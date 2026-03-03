# Présentation de l'application - Shopping Mall

## 1. Contexte
Shopping Mall est une application web de centre commercial avec trois profils:
- `Admin` (gestion globale)
- `Vendeur` / `Boutique` (gestion produits et ventes)
- `Acheteur` (parcours d'achat)

## 2. Stack technique
- Frontend: Angular
- Backend: Express (JavaScript)
- Base de données: MongoDB
- Authentification: JWT
- Déploiement: Render

## 3. Fonctionnalités principales

### 3.1 Authentification et rôles
- Connexion sécurisée JWT
- Rôles séparés: Admin, Vendeur, Acheteur
- Changement de mot de passe via `Settings`
- Comptes vendeurs créés par l'admin

### 3.2 Côté acheteur
- Consultation catalogue produits
- Recherche et filtres (catégorie, prix, texte)
- Panier avec gestion de quantités
- Checkout avec formulaire livraison
- Historique des commandes

### 3.3 Côté vendeur
- Création / modification / suppression produits
- Attribution du box par l'admin
- Dashboard boutique (produits, vendu, revenu)
- Historique des acheteurs et commandes associées

### 3.4 Côté admin
- Dashboard administratif
- Gestion utilisateurs (ban, déban, suppression)
- Création directe des comptes vendeurs
- Attribution du box vendeur

### 3.5 Gestion transaction et stock
- Validation du paiement
- Enregistrement du snapshot transaction (infos client + livraison + vendeur)
- Décrémentation du stock réel lors du paiement validé
- Mise à jour de disponibilité en temps réel selon le panier

## 4. Logins par défaut (démo)
Utiliser ces comptes pour les démonstrations:
- Admin: `admin@gmail.com` / `administrateur`
- Vendeur: `vendeur@gmail.com` / `vendeur123`
- Acheteur: `acheteur@gmail.com` / `acheteur`

Ces comptes sont aussi accessibles en boutons rapides sur l'écran de connexion.

## 5. Copies d'écran à insérer
Placer les images dans `docs/screenshots/`.

### 5.1 Accueil
![Accueil](./screenshots/01-accueil.png)

### 5.2 Connexion (logins démo)
![Connexion](./screenshots/02-login.png)

### 5.3 Catalogue produits
![Produits](./screenshots/03-produits.png)

### 5.4 Panier et checkout
![Panier](./screenshots/04-panier.png)
![Checkout](./screenshots/05-checkout.png)

### 5.5 Dashboard vendeur
![Dashboard vendeur](./screenshots/06-dashboard-vendeur.png)
![Gestion produits vendeur](./screenshots/07-produits-vendeur.png)

### 5.6 Dashboard admin
![Dashboard admin](./screenshots/08-dashboard-admin.png)
![Gestion utilisateurs](./screenshots/09-gestion-users-admin.png)

## 6. Parcours de démonstration conseillé (jury)
1. Connexion admin et création d'un vendeur.
2. Connexion vendeur et publication d'un produit.
3. Connexion acheteur: ajout panier, paiement, vérification historique.
4. Retour vendeur: vérifier stock, vendu, historique client.
5. Retour admin: vérifier gestion globale utilisateurs.

## 7. Points forts
- Architecture claire frontend/backend
- Séparation stricte des rôles
- UX responsive
- Gestion transactionnelle de paiement et stock
- Fonctionnalités orientées cas réel de centre commercial
