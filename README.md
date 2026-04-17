# Sistema Automatizado de Validação de Pedidos

Este projeto é uma solução integrada de automação (RPA) e front-end desenvolvida para validar a conformidade de pedidos. O sistema extrai dados de um portal Backoffice e cruza-os com as informações extraídas automaticamente de ficheiros PDF associados, utilizando um site local para gerar o relatório final de validação.

## Arquitetura do Projeto

O projeto está dividido em duas partes fundamentais que trabalham em conjunto:
1. **Frontend (React):** Uma aplicação web a correr localmente (`http://localhost:3000/`) que recebe os dados extraídos, exibe as comparações (Dados Backoffice vs. Dados PDF) e regista se a validação está "Conforme" ou "Divergente".
2. **Robô de Automação (Robot Framework):** Um script desenvolvido em Python/Robot Framework que navega autonomamente no Backoffice, descarrega faturas/comprovativos em PDF, extrai a informação usando Expressões Regulares (Regex) e preenche automaticamente o site React.

## Funcionalidades

- **Navegação Autónoma:** Login automático na conta Microsoft e navegação até ao módulo de pedidos.
- **Extração de Dados Web:** Captura de informações em ecrã (Data, Cliente, CNPJ, Email, Item, Servidor, Chave de Ativação).
- **Leitura Inteligente de PDF:** Download de PDFs em background e extração de texto isolando blocos específicos (ex: ignorando CNPJs de Distribuidores e focando apenas no Cliente Final).
- **Controlo de Execução:** Configuração fácil da quantidade máxima de pedidos a testar por execução (variável `${MAX_PEDIDOS_TESTE}`).
- **Paginação Automática:** O robô avança para as páginas seguintes automaticamente se não atingir a meta na primeira página.
- **Integração Front-end:** Preenchimento automático dos inputs no site React e submissão (salvaguarda) do relatório.

## Tecnologias Utilizadas

- **Frontend:** [React.js](https://reactjs.org/)
- **Automação (RPA):** [Robot Framework](https://robotframework.org/)
- **Linguagem Base do Robô:** [Python](https://www.python.org/)
- **Bibliotecas Robot:** - `RPA.Browser.Selenium` (Manipulação do navegador)
  - `RPA.PDF` (Leitura de ficheiros PDF)
  - `String` & `OperatingSystem` (Manipulação de texto e ficheiros)

## Como Instalar e Configurar

### Pré-requisitos
Certifique-se de que tem instalado na sua máquina:
- **Node.js** (para correr o projeto React)
- **Python** (versão 3.8 ou superior)
- **Pip** (gestor de pacotes do Python)

### 1. Configurar a Automação (Robot Framework)
Abra um terminal e instale as dependências necessárias para o robô:
```bash
pip install robotframework
pip install rpaframework
