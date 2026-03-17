"""
Audit complet des notifications/toasts dans l'application.
"""
import re
import os

def scan_toasts():
    """Scan tous les fichiers TSX pour extraire les messages de toast."""
    toast_messages = []
    src_path = os.path.join(os.path.dirname(__file__), "src", "app")
    
    for root, dirs, files in os.walk(src_path):
        for file in files:
            if file.endswith(".tsx"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        # Extraire tous les appels toast.success/info/error/warning
                        matches = re.findall(
                            r'toast\.(success|info|error|warning)\(["\']([^"\']+)["\']',
                            content
                        )
                        for match in matches:
                            toast_type, message = match
                            toast_messages.append({
                                "file": os.path.relpath(filepath, src_path),
                                "type": toast_type,
                                "message": message
                            })
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    
    return toast_messages

def analyze_notifications():
    """Analyse les notifications pour identifier les problèmes."""
    messages = scan_toasts()
    
    print("=" * 80)
    print("AUDIT COMPLET DES NOTIFICATIONS/TOASTS")
    print("=" * 80)
    
    # Catégoriser les messages
    success = [m for m in messages if m["type"] == "success"]
    error = [m for m in messages if m["type"] == "error"]
    info = [m for m in messages if m["type"] == "info"]
    warning = [m for m in messages if m["type"] == "warning"]
    
    print(f"\n📊 STATISTIQUES:")
    print(f"  Total: {len(messages)} messages")
    print(f"  ✅ Success: {len(success)}")
    print(f"  ❌ Error: {len(error)}")
    print(f"  ℹ️  Info: {len(info)}")
    print(f"  ⚠️  Warning: {len(warning)}")
    
    # Identifier les simulations
    simulations = [m for m in messages if "simulation" in m["message"].lower() or "généré avec succès (simulation)" in m["message"].lower()]
    print(f"\n🎭 SIMULATIONS IDENTIFIÉES: {len(simulations)}")
    for sim in simulations:
        print(f"  - {sim['file']}: \"{sim['message']}\"")
    
    # Messages de succès
    print(f"\n✅ MESSAGES DE SUCCÈS ({len(success)}):")
    for msg in success:
        print(f"  - {msg['file']}: \"{msg['message']}\"")
    
    # Messages d'erreur
    print(f"\n❌ MESSAGES D'ERREUR ({len(error)}):")
    for msg in error:
        print(f"  - {msg['file']}: \"{msg['message']}\"")
    
    # Messages d'info
    print(f"\nℹ️  MESSAGES D'INFO ({len(info)}):")
    for msg in info:
        print(f"  - {msg['file']}: \"{msg['message']}\"")
    
    # Vérifier la cohérence des messages
    print(f"\n🔍 VÉRIFICATION DE COHÉRENCE:")
    
    # Messages de succès génériques vs spécifiques
    generic_success = [m for m in success if any(word in m["message"].lower() for word in ["succès", "créé", "ajouté", "envoyée", "soumise", "modifié", "validé", "enregistré"])]
    print(f"  Messages de succès spécifiques: {len(generic_success)}/{len(success)}")
    
    # Messages d'erreur génériques vs spécifiques
    generic_error = [m for m in error if any(word in m["message"].lower() for word in ["erreur lors de", "veuillez", "champs obligatoires", "incorrects"])]
    specific_error = [m for m in error if m not in generic_error]
    print(f"  Messages d'erreur spécifiques: {len(specific_error)}/{len(error)}")
    
    # Vérifier les messages qui pourraient être améliorés
    print(f"\n💡 RECOMMANDATIONS:")
    
    # Simulations à remplacer
    if simulations:
        print(f"  - {len(simulations)} simulations identifiées à remplacer par de vraies fonctionnalités")
    
    # Messages d'erreur génériques
    generic_patterns = ["Erreur lors de la", "Veuillez remplir", "Identifiants incorrects"]
    for pattern in generic_patterns:
        count = len([m for m in error if pattern in m["message"]])
        if count > 1:
            print(f"  - {count} messages d'erreur avec le motif \"{pattern}\" (pourrait être plus spécifiques)")
    
    # Messages de succès qui pourraient inclure plus de détails
    simple_success = [m for m in success if len(m["message"]) < 30]
    if simple_success:
        print(f"  - {len(simple_success)} messages de succès très simples (pourraient inclure plus de contexte)")
    
    # Messages en français vs anglais
    english_words = ["success", "error", "created", "updated", "deleted"]
    english_msgs = [m for m in messages if any(word in m["message"].lower() for word in english_words)]
    if english_msgs:
        print(f"  - {len(english_msgs)} messages contenant des mots anglais (devraient être en français)")
    
    print("\n" + "=" * 80)
    print("FIN DE L'AUDIT")
    print("=" * 80)

if __name__ == "__main__":
    analyze_notifications()
