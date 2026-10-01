# -*- coding: utf-8 -*-
"""Builds a self-contained folder to run Mishkat on this PC by double-click:
  IslamicAI_Challenge/MISHKAT_PC/  ← copy of public/, functions/, server.mjs + launcher
  python data_build/make_pc_bundle.py
The AI key (.dev.vars) is copied only into this LOCAL folder, never into git.
"""
import os
import shutil
import sys
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(os.path.dirname(REPO), 'MISHKAT_PC')
APP = os.path.join(OUT, 'app')

os.makedirs(APP, exist_ok=True)
for d in ('public', 'functions'):
    dst = os.path.join(APP, d)
    if os.path.exists(dst):
        shutil.rmtree(dst, ignore_errors=True)  # the app folder itself may be open in a terminal: refresh its content only
    shutil.copytree(os.path.join(REPO, d), dst, dirs_exist_ok=True)
for f in ('server.mjs', 'package.json', '.dev.vars'):
    src = os.path.join(REPO, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(APP, f))

BAT = r"""@echo off
chcp 65001 >nul
title Mishkat
cd /d "%~dp0app"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js est necessaire pour lancer Mishkat : https://nodejs.org  ^(version LTS^)
  echo.
  pause
  exit /b 1
)
echo.
echo  Mishkat demarre sur http://127.0.0.1:8787/
echo  Laissez cette fenetre ouverte pendant l'utilisation ; fermez-la pour arreter.
echo.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://127.0.0.1:8787/"
node server.mjs 8787
pause
"""
with open(os.path.join(OUT, 'OUVRIR_MISHKAT.bat'), 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(BAT)

README = """MISHKAT — lancer sur ce PC
==========================

1. Double-cliquez sur  OUVRIR_MISHKAT.bat
   → une fenêtre noire s'ouvre (le serveur local), puis le navigateur affiche Mishkat.
2. Écrivez, collez ou dites la basmala pour entrer.
3. Pour arrêter : fermez la fenêtre noire.

• Nécessite Node.js (déjà installé sur ce PC ; sinon https://nodejs.org).
• Adresse : http://127.0.0.1:8787/  (accessible uniquement depuis ce PC).
• L'IA (recherche augmentée, voix) utilise la clé du fichier app/.dev.vars ;
  sans clé ou sans quota, Mishkat fonctionne en mode sans IA, toujours sourcé.
• La récitation et la voix demandent Internet ; le reste fonctionne hors ligne.
• Ce dossier est une copie : pour le mettre à jour après des changements,
  relancez  python data_build/make_pc_bundle.py  dans le dossier mishkat.
"""
with open(os.path.join(OUT, 'LISEZ-MOI.txt'), 'w', encoding='utf-8') as f:
    f.write(README)

size = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(OUT) for x in fs)
print('bundle:', OUT, f'{size / 1e6:.1f} MB')
