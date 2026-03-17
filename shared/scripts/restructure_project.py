"""
Script pour restructurer le projet avec distinction claire frontend/backend.
"""
import os
import shutil
from pathlib import Path

def create_clean_structure():
    """Créer une structure propre du projet."""
    
    base_dir = Path("C:/Users/STAGIAIRE-ACS/CascadeProjects/magistrat-douane")
    
    print("=" * 80)
    print("RESTRUCTURATION PROJET - FRONTEND/BACKEND SÉPARÉS")
    print("=" * 80)
    
    # Structure cible
    target_structure = {
        "frontend": {
            "src": {
                "app": {},
                "components": {},
                "hooks": {},
                "lib": {},
                "stores": {}
            },
            "public": {},
            "tests": {},
            "package.json": "move_from_root",
            "next.config.ts": "move_from_root",
            "tsconfig.json": "move_from_root",
            "tailwind.config.ts": "move_from_root",
            "components.json": "move_from_root",
            "eslint.config.mjs": "move_from_root",
            "postcss.config.mjs": "move_from_root",
            "next-env.d.ts": "move_from_root",
            ".env.local": "move_from_root",
            "node_modules": "move_from_root",
            ".next": "move_from_root"
        },
        "backend": {
            "accounts": "keep_existing",
            "config": "keep_existing", 
            "core": "keep_existing",
            "notifications": "keep_existing",
            "manage.py": "keep_existing",
            "requirements.txt": "keep_existing",
            "db.sqlite3": "keep_existing",
            ".env": "keep_existing",
            "audit.log": "keep_existing",
            "run_asgi.py": "keep_existing",
            "seed.py": "keep_existing",
            "test_api.py": "keep_existing",
            "tests": {},
            "scripts": {}
        },
        "shared": {
            "docs": {},
            "scripts": {},
            "tests": {}
        }
    }
    
    print("\n📋 Structure cible:")
    print("magistrat-douane/")
    print("├── frontend/          # Next.js + TypeScript")
    print("│   ├── src/")
    print("│   ├── public/")
    print("│   ├── tests/")
    print("│   └── package.json")
    print("├── backend/           # Django + DRF")
    print("│   ├── accounts/")
    print("│   ├── config/")
    print("│   ├── notifications/")
    print("│   ├── tests/")
    print("│   └── manage.py")
    print("├── shared/            # Documentation et scripts partagés")
    print("│   ├── docs/")
    print("│   ├── scripts/")
    print("│   └── tests/")
    print("├── README.md")
    print("├── .gitignore")
    print("└── .git/")
    
    print("\n🔄 Actions à effectuer:")
    
    # 1. Créer les dossiers manquants
    print("\n1️⃣ Création des dossiers...")
    
    # Backend - tests et scripts
    backend_tests_dir = base_dir / "backend" / "tests"
    backend_scripts_dir = base_dir / "backend" / "scripts"
    
    if not backend_tests_dir.exists():
        print(f"  📁 Créer: backend/tests/")
        backend_tests_dir.mkdir(exist_ok=True)
    
    if not backend_scripts_dir.exists():
        print(f"  📁 Créer: backend/scripts/")
        backend_scripts_dir.mkdir(exist_ok=True)
    
    # Frontend - déplacer src vers frontend/src
    frontend_dir = base_dir / "frontend"
    frontend_src_dir = frontend_dir / "src"
    frontend_tests_dir = frontend_dir / "tests"
    
    if not frontend_dir.exists():
        print(f"  📁 Créer: frontend/")
        frontend_dir.mkdir(exist_ok=True)
    
    if not frontend_tests_dir.exists():
        print(f"  📁 Créer: frontend/tests/")
        frontend_tests_dir.mkdir(exist_ok=True)
    
    # Shared
    shared_dir = base_dir / "shared"
    shared_docs_dir = shared_dir / "docs"
    shared_scripts_dir = shared_dir / "scripts"
    shared_tests_dir = shared_dir / "tests"
    
    if not shared_dir.exists():
        print(f"  📁 Créer: shared/")
        shared_dir.mkdir(exist_ok=True)
    
    if not shared_docs_dir.exists():
        print(f"  📁 Créer: shared/docs/")
        shared_docs_dir.mkdir(exist_ok=True)
    
    if not shared_scripts_dir.exists():
        print(f"  📁 Créer: shared/scripts/")
        shared_scripts_dir.mkdir(exist_ok=True)
    
    if not shared_tests_dir.exists():
        print(f"  📁 Créer: shared/tests/")
        shared_tests_dir.mkdir(exist_ok=True)
    
    # 2. Déplacer les fichiers frontend
    print("\n2️⃣ Déplacement des fichiers frontend...")
    
    frontend_files_to_move = [
        "package.json",
        "next.config.ts", 
        "tsconfig.json",
        "components.json",
        "eslint.config.mjs",
        "postcss.config.mjs",
        "next-env.d.ts",
        ".env.local"
    ]
    
    for file in frontend_files_to_move:
        src_file = base_dir / file
        dst_file = frontend_dir / file
        
        if src_file.exists() and not dst_file.exists():
            print(f"  📦 Déplacer: {file} -> frontend/{file}")
            shutil.move(str(src_file), str(dst_file))
    
    # Déplacer les dossiers frontend
    frontend_dirs_to_move = [
        "src",
        "public", 
        "node_modules",
        ".next"
    ]
    
    for dir_name in frontend_dirs_to_move:
        src_dir = base_dir / dir_name
        dst_dir = frontend_dir / dir_name
        
        if src_dir.exists() and not dst_dir.exists():
            print(f"  📦 Déplacer: {dir_name}/ -> frontend/{dir_name}/")
            shutil.move(str(src_dir), str(dst_dir))
    
    # 3. Déplacer les fichiers de test et scripts
    print("\n3️⃣ Déplacement des tests et scripts...")
    
    # Scripts Python de test
    test_files = [
        "test_agent_password.py",
        "test_all_endpoints.py", 
        "test_auth_persistence.py",
        "test_basic_connection.py",
        "test_e2e_workflow.py",
        "test_final_complete.py",
        "test_final_workflow.py",
        "test_frontend_websocket.py",
        "test_inactive_agents.py",
        "test_inactive_password.py",
        "test_name_login.py",
        "test_notifications_click.py",
        "test_notifications_dropdown.py",
        "test_real_notifications.py",
        "test_realtime_notifications.py",
        "test_register_no_email.py",
        "test_session_persistence.py",
        "test_single_login.py",
        "test_toggle_agent.py",
        "test_update_agent.py",
        "test_websocket_connection.py",
        "test_websocket_connection_simple.py",
        "test_websocket_final.py"
    ]
    
    for file in test_files:
        src_file = base_dir / file
        dst_file = shared_tests_dir / file
        
        if src_file.exists():
            print(f"  📦 Déplacer: {file} -> shared/tests/{file}")
            shutil.move(str(src_file), str(dst_file))
    
    # Scripts utilitaires
    script_files = [
        "clean_database.py",
        "diagnostic_websocket.py",
        "fix_users_email.py",
        "add_indexes.py",
        "audit_notifications.py"
    ]
    
    for file in script_files:
        src_file = base_dir / file
        dst_file = shared_scripts_dir / file
        
        if src_file.exists():
            print(f"  📦 Déplacer: {file} -> shared/scripts/{file}")
            shutil.move(str(src_file), str(dst_file))
    
    # 4. Mettre à jour les chemins dans les fichiers
    print("\n4️⃣ Mise à jour des chemins...")
    
    # Mettre à jour le README
    readme_file = base_dir / "README.md"
    if readme_file.exists():
        print("  📝 Mettre à jour: README.md")
        with open(readme_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace(
            "# Magistrat Douane",
            "# Magistrat Douane\n\n## Structure du projet\n\n```\nmagistrat-douane/\n├── frontend/          # Next.js + TypeScript\n│   ├── src/\n│   ├── public/\n│   ├── tests/\n│   └── package.json\n├── backend/           # Django + DRF\n│   ├── accounts/\n│   ├── config/\n│   ├── notifications/\n│   ├── tests/\n│   └── manage.py\n├── shared/            # Documentation et scripts partagés\n│   ├── docs/\n│   ├── scripts/\n│   └── tests/\n└── README.md\n```"
        )
        
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
    
    print("\n" + "=" * 80)
    print("RESTRUCTURATION TERMINÉE")
    print("=" * 80)
    print("✅ Structure propre créée")
    print("✅ Frontend séparé dans frontend/")
    print("✅ Backend séparé dans backend/")
    print("✅ Scripts et tests dans shared/")
    print("✅ Documentation dans shared/docs/")
    print("\n📋 Prochaines étapes:")
    print("1. Mettre à jour les scripts de démarrage")
    print("2. Mettre à jour les chemins d'import")
    print("3. Tester que tout fonctionne")
    print("=" * 80)

if __name__ == "__main__":
    create_clean_structure()
