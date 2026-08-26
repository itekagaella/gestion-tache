document.getElementById("paymentForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const nom = document.getElementById("nom").value;
    const montant = document.getElementById("montant").value;
    const methode = document.getElementById("methode").value;

    alert(
        "Paiement préparé !\n\n" +
        "Nom : " + nom + "\n" +
        "Montant : " + montant + " FBU\n" +
        "Méthode : " + methode
    );
});