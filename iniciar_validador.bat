@echo off
title Validador de Dados Automatizado
chcp 65001 > nul
echo ========================================================
echo       VALIDADOR DE DADOS AUTOMATIZADO - WEB + PYTHON
echo ========================================================
echo.
echo Iniciando o servidor local...
start "" "http://127.0.0.1:5000"
python app.py
pause

