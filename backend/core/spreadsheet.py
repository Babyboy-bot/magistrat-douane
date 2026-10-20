"""Neutralisation des formules dans les exports tableur (injection CSV / Excel).

Une valeur saisie par un utilisateur et commençant par « = + - @ » peut être
interprétée comme une formule à l'ouverture du fichier par un agent.
"""
_PREFIXES_FORMULE = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value):
    """Préfixe d'une apostrophe toute chaîne qu'un tableur prendrait pour une formule."""
    if isinstance(value, str) and value.startswith(_PREFIXES_FORMULE):
        return "'" + value
    return value


def neutraliser_formules(ws):
    """Force en texte toute cellule qu'openpyxl a enregistrée comme formule.

    Nos exports n'écrivent aucune formule : une cellule de type formule vient
    forcément d'une valeur saisie commençant par « = ».
    """
    for row in ws.iter_rows():
        for cell in row:
            if cell.data_type == "f":
                cell.data_type = "s"
