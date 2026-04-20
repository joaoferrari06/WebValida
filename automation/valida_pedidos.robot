*** Settings ***
# Importação das bibliotecas necessárias para o robô funcionar
Library    RPA.Browser.Selenium    # Permite controlar o navegador de internet (Chrome, Edge, etc.)
Library    RPA.PDF                 # Permite ler e extrair texto de ficheiros PDF
Library    String                  # Contém ferramentas para manipular textos
Library    OperatingSystem         # Permite criar pastas, apagar e listar ficheiros no computador

*** Variables ***
# ================= CONFIGURAÇÕES DO TESTE =================
${MAX_PEDIDOS_TESTE}   1    

# ================= DADOS DE LOGIN E URLS =================
${URL_BACKOFFICE}      https://portal.backoffice.stag.isec.intelbras.com.br/auth/login
${URL_MEU_SITE}        http://localhost:3000/
${USER_EMAIL}          # Email
${USER_PASS}           # Senha
${DIRETORIO_DOWNLOAD}  ${CURDIR}${/}Downloads_Robo    # Cria uma pasta "Downloads_Robo" no mesmo local do script

# ================= XPATHS LOGIN E NAVEGAÇÃO =================
# XPaths são como "moradas" que dizem ao robô exatamente onde clicar ou ler no ecrã
${XP_BTN_ABRIR_LOGIN}  xpath://*[@id="root"]/div/div/div[2]/div/button
${XP_EMAIL}            id:i0116
${XP_SENHA}            name:passwd
${XP_BTN_CONFIRMA}     id:idSIButton9
${XP_MENU_INICIAL}     xpath://*[@id="root"]/div/div/div/div/ul/li[1]/a
${XP_BTN_DEFENSE}      xpath://*[@id="root"]/div/div/main/div/div[2]/div[2]/div/a/div/button
${XP_MENU_PEDIDOS}     xpath:/html/body/div[2]/div/div/div/ul/li[2]/a

# ================= XPATHS DA LISTA =================
${XP_LINHAS_FINALIZADAS}    xpath://tr[contains(., 'Finalizado')]
${XP_VER_DETALHES}          xpath://li[contains(., 'Ver detalhes')]
${XP_BTN_PROXIMA_PAGINA}    xpath:/html/body/div[2]/div/main/div/div[2]/div[3]/div/div/div[2]/button[2]

# ================= XPATHS DENTRO DO PEDIDO (BACKOFFICE) =================
${XP_BTN_VISUALIZAR_PDF}    xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[1]/div/div/button[2]

${XP_BO_DATA}               xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[1]/div/div/dd[3]
${XP_BO_CLIENTE}            xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[3]/div/section/div[3]/dd[1]
${XP_BO_CNPJ}               xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[3]/div/section/div[3]/dd[2]
${XP_BO_EMAIL}              xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[3]/div/section/div[3]/dd[3]
${XP_BO_ITEM}               xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[4]/div[1]/div/div[2]/div/div[2]/dd
${XP_BO_SERVIDOR}           xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[4]/div[1]/div/div[1]/div[1]/div[2]/span[2]
${XP_BO_CHAVE}              xpath:/html/body/div[2]/div/main/div/div/div[2]/div/div[4]/div[1]/div/div[2]/div/div[2]/div[1]/h3/p

# ================= XPATHS DO SEU SITE (VALIDAÇÃO) =================
${XP_BTN_SALVAR_VALIDACAO}  xpath://*[@id="root"]/div/main/section[2]/div/div[4]/div[2]/button[1]

*** Tasks ***
# Esta é a tarefa principal que organiza a ordem de todas as ações
Validar Pedidos Intelbras Com Site Externo
    Log To Console    \n======================================================
    Log To Console    INICIANDO AUTOMAÇÃO DE VALIDAÇÃO DE PEDIDOS
    Log To Console    META: Testar até ${MAX_PEDIDOS_TESTE} pedido(s)
    Log To Console    ======================================================
    Criar Pasta De Downloads
    Configurar Navegador Com Download Automatico
    Realizar Login Microsoft
    Navegar Ate Pedidos
    Processar E Comparar Pedidos
    Log To Console    \n======================================================
    Log To Console    AUTOMAÇÃO FINALIZADA COM SUCESSO!
    Log To Console    ======================================================

*** Keywords ***
# ==============================================================================
# FUNÇÕES DE PREPARAÇÃO E LOGIN
# ==============================================================================

Criar Pasta De Downloads
    # Prepara a pasta onde os PDFs vão cair, apagando qualquer ficheiro velho que lá esteja
    Log To Console    [INFO] Criando e limpando pasta de downloads do robô...
    OperatingSystem.Create Directory    ${DIRETORIO_DOWNLOAD}
    OperatingSystem.Empty Directory     ${DIRETORIO_DOWNLOAD}

Configurar Navegador Com Download Automatico
    # Abre o navegador forçando-o a descarregar o PDF em vez de o abrir num novo separador
    Log To Console    [INFO] Abrindo navegador e acessando portal Backoffice...
    ${prefs}=    Create Dictionary    download.default_directory=${DIRETORIO_DOWNLOAD}    plugins.always_open_pdf_externally=${True}
    Open Available Browser    ${URL_BACKOFFICE}    maximized=${True}    preferences=${prefs}
    Wait Until Element Is Visible    ${XP_BTN_ABRIR_LOGIN}    15s
    Click Element    ${XP_BTN_ABRIR_LOGIN}

Realizar Login Microsoft
    # Preenche as credenciais da Microsoft com esperas seguras (Wait) para a página não quebrar
    Log To Console    [INFO] Realizando login na conta Microsoft...
    Wait Until Element Is Visible    ${XP_EMAIL}    30s
    Input Text                       ${XP_EMAIL}    ${USER_EMAIL}
    Click Element                    ${XP_BTN_CONFIRMA}
    Sleep    5s
    Wait Until Element Is Visible    ${XP_SENHA}    30s
    Input Password                   ${XP_SENHA}    ${USER_PASS}
    Click Element                    ${XP_BTN_CONFIRMA}
    Sleep    3s
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible    ${XP_BTN_CONFIRMA}    5s
    IF    ${status}
        Click Element    ${XP_BTN_CONFIRMA}
    END
    Log To Console    [SUCESSO] Login realizado com sucesso!

Navegar Ate Pedidos
    Log To Console    [INFO] Navegando até a página de pedidos...
    Wait Until Element Is Visible    ${XP_MENU_INICIAL}    30s
    Click Element    ${XP_MENU_INICIAL}
    Wait Until Element Is Visible    ${XP_BTN_DEFENSE}     20s
    Click Element    ${XP_BTN_DEFENSE}
    Wait Until Element Is Visible    ${XP_MENU_PEDIDOS}    20s
    Click Element    ${XP_MENU_PEDIDOS}

# ==============================================================================
# FUNÇÃO PRINCIPAL DO LOOP (PAGINAÇÃO E CONTAGEM)
# ==============================================================================

Processar E Comparar Pedidos
    ${pedidos_processados}=    Set Variable    ${0}    
    
    WHILE    ${pedidos_processados} < ${MAX_PEDIDOS_TESTE}
        Log To Console    [INFO] Carregando lista de pedidos da página atual...
        Wait Until Element Is Visible    ${XP_LINHAS_FINALIZADAS}    30s
        ${qtd_linhas}=    Get Element Count    ${XP_LINHAS_FINALIZADAS}    
        Log To Console    [INFO] Encontrados ${qtd_linhas} pedidos com status 'Finalizado' nesta página.
        
        FOR    ${i}    IN RANGE    1    ${qtd_linhas} + 1
            IF    ${pedidos_processados} >= ${MAX_PEDIDOS_TESTE}
                BREAK
            END
            
            ${pedido_atual}=    Evaluate    ${pedidos_processados} + 1
            Log To Console    \n------------------------------------------------------
            Log To Console    [PROCESSANDO] Validando Pedido ${pedido_atual} de ${MAX_PEDIDOS_TESTE}
            
            # Constrói o XPath dinamicamente para clicar no botão certo de cada linha
            ${xpath_botao_atual}=    Set Variable    xpath:(//tr[contains(., 'Finalizado')])[${i}]/td[8]/button
            Wait Until Element Is Visible    ${xpath_botao_atual}    10s
            Click Element    ${xpath_botao_atual}
            Wait Until Element Is Visible    ${XP_VER_DETALHES}    10s
            Click Element    ${XP_VER_DETALHES}
            
            # Chama a palavra-chave que vai ler tudo e enviar para o seu site React
            Extrair Dados E Validar
            
            # Volta para trás na página web para clicar no pedido seguinte
            Go Back
            Wait Until Element Is Visible    ${XP_LINHAS_FINALIZADAS}    30s
            
            # Adiciona +1 ao contador de pedidos
            ${pedidos_processados}=    Evaluate    ${pedidos_processados} + 1
        END
        
        # Se os pedidos da página acabaram mas a meta não foi atingida, clica na próxima página
        IF    ${pedidos_processados} < ${MAX_PEDIDOS_TESTE}
            ${tem_proxima}=    Run Keyword And Return Status    Element Should Be Enabled    ${XP_BTN_PROXIMA_PAGINA}
            IF    ${tem_proxima}
                Log To Console    [INFO] Meta não alcançada. Indo para a próxima página de pedidos...
                Click Element    ${XP_BTN_PROXIMA_PAGINA}
                Sleep    3s    # Aguarda o ecrã carregar
            ELSE
                Log To Console    [AVISO] Não há mais páginas disponíveis. Fim da lista.
                BREAK
            END
        END
    END

# ==============================================================================
# FUNÇÃO DE EXTRAÇÃO E LEITURA (BACKOFFICE + PDF)
# ==============================================================================

Extrair Dados E Validar
    Wait Until Element Is Visible    ${XP_BTN_VISUALIZAR_PDF}    15s
    
    Log To Console    >>> Lendo dados do Backoffice...
    
    # Cada bloco abaixo tenta extrair um dado do ecrã. Se falhar (por não existir), a variável fica vazia (${EMPTY})
    # 1. Data do Pedido
    ${status}  ${bo_data_bruto}=  Run Keyword And Ignore Error  Get Text  ${XP_BO_DATA}
    ${bo_data_bruto}=             Set Variable If  '${status}' == 'PASS'  ${bo_data_bruto}  ${EMPTY}
    ${match_bo_data}=             Evaluate  re.search(r'\\d{2}/\\d{2}/\\d{4}', '${bo_data_bruto}')  modules=re
    ${bo_data}=                   Evaluate  $match_bo_data.group(0) if $match_bo_data else '${bo_data_bruto}'

    # 2. Cliente
    ${status}  ${bo_cliente}=     Run Keyword And Ignore Error  Get Text  ${XP_BO_CLIENTE}
    ${bo_cliente}=                Set Variable If  '${status}' == 'PASS'  ${bo_cliente}  ${EMPTY}

    # 3. CNPJ
    ${status}  ${bo_cnpj}=        Run Keyword And Ignore Error  Get Text  ${XP_BO_CNPJ}
    ${bo_cnpj}=                   Set Variable If  '${status}' == 'PASS'  ${bo_cnpj}  ${EMPTY}
    
    # 4. Email
    ${status}  ${bo_email}=       Run Keyword And Ignore Error  Get Text  ${XP_BO_EMAIL}
    ${bo_email}=                  Set Variable If  '${status}' == 'PASS'  ${bo_email}  ${EMPTY}
    
    # 5. Item
    ${status}  ${bo_item}=        Run Keyword And Ignore Error  Get Text  ${XP_BO_ITEM}
    ${bo_item}=                   Set Variable If  '${status}' == 'PASS'  ${bo_item}  ${EMPTY}
    
    # 6. Servidor
    ${status}  ${bo_servidor}=    Run Keyword And Ignore Error  Get Text  ${XP_BO_SERVIDOR}
    ${bo_servidor}=               Set Variable If  '${status}' == 'PASS'  ${bo_servidor}  ${EMPTY}
    
    # 7. Chave (espera até 3 segundos pois às vezes demora a aparecer no ecrã)
    ${status}  ${bo_chave}=       Run Keyword And Ignore Error  Wait Until Element Is Visible  ${XP_BO_CHAVE}  3s
    ${status}  ${bo_chave}=       Run Keyword And Ignore Error  Get Text  ${XP_BO_CHAVE}
    ${bo_chave}=                  Set Variable If  '${status}' == 'PASS'  ${bo_chave}  ${EMPTY}
    
    Log To Console    >>> Dados do Backoffice lidos com sucesso.
    
    # ------------------ DOWNLOAD DO PDF ------------------
    Log To Console    >>> Baixando arquivo PDF...
    Run Keyword And Ignore Error    OperatingSystem.Empty Directory    ${DIRETORIO_DOWNLOAD}
    Click Element    ${XP_BTN_VISUALIZAR_PDF}
    
    # O robô fica num ciclo à espera que o ficheiro PDF caia efetivamente na pasta
    Wait Until Keyword Succeeds    20s    2s    Verificar Se PDF Chegou No Diretorio
    
    # Encontra o nome do ficheiro e guarda o conteúdo do PDF numa variável bruta
    ${arquivos}=           OperatingSystem.List Files In Directory    ${DIRETORIO_DOWNLOAD}    *.pdf
    ${texto_pdf_bruto}=    Get Text From Pdf    ${DIRETORIO_DOWNLOAD}${/}${arquivos[0]}
    Close All Pdfs
    
    # Junta todo o texto extraído do PDF numa única e longa linha para facilitar a busca (regex)
    ${texto_unido}=        Evaluate    chr(10).join([str(v) for v in $texto_pdf_bruto.values()])
    ${texto_limpo}=        Evaluate    "".join([c for c in str($texto_unido) if c.isprintable() or c.isspace()])
    ${texto_uma_linha}=    Evaluate    re.sub(r'\\s+', ' ', $texto_limpo.replace('"', '').replace(',', ''))    modules=re

    Log To Console         >>> PDF lido com sucesso. Extraindo informações...

    # Limpa espaços excessivos do servidor e item do Backoffice para os comparar com os do PDF
    ${bo_servidor_limpo}=  Evaluate    '${bo_servidor}'.strip()
    ${bo_item_limpo}=      Evaluate    re.sub(r'\\s+', ' ', '${bo_item}'.strip())    modules=re

    # ------------------ BUSCA DE DADOS NO PDF (REGEX) ------------------
    # As funções re.search procuram padrões exatos de texto dentro daquela "linha única" gerada acima

    # 1. Data (Procura a data a seguir à palavra "pedido:")
    ${match_data}=         Evaluate    re.search(r'Data de criação do pedido:\\s*(\\d{2}/\\d{2}/\\d{4})', $texto_uma_linha, re.IGNORECASE)    modules=re
    ${pdf_data}=           Evaluate    $match_data.group(1) if $match_data else ''

    # 2. Cliente Final (Pega tudo entre "CLIENTE FINAL:" e o formato do CNPJ, ignorando o Distribuidor)
    ${match_cliente}=      Evaluate    re.search(r'CLIENTE FINAL:\\s*(.*?)\\s*(?=\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2})', $texto_uma_linha, re.IGNORECASE)    modules=re
    ${pdf_cliente}=        Evaluate    $match_cliente.group(1).strip() if $match_cliente else ''

    # 3. CNPJ (Pega o primeiro CNPJ que aparece *depois* da string "CLIENTE FINAL:")
    ${match_cnpj}=         Evaluate    re.search(r'CLIENTE FINAL:.*?(\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2})', $texto_uma_linha, re.IGNORECASE)    modules=re
    ${pdf_cnpj}=           Evaluate    $match_cnpj.group(1).strip() if $match_cnpj else ''

    # 4. Email (Procura qualquer formato de e-mail padrão)
    ${pdf_emails}=         Evaluate    re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', $texto_uma_linha)    modules=re
    ${pdf_email}=          Evaluate    $pdf_emails[-1] if $pdf_emails else ''

    # 5. Servidor e Item (O código verifica se a string retirada do Backoffice existe dentro do PDF)
    ${pdf_servidor}=       Evaluate    '${bo_servidor_limpo}' if '${bo_servidor_limpo}' != '' and '${bo_servidor_limpo}' in $texto_uma_linha else 'Nao Encontrado'
    ${pdf_item}=           Evaluate    '${bo_item_limpo}' if '${bo_item_limpo}' != '' and '${bo_item_limpo}' in $texto_uma_linha else 'Nao Encontrado'

    # 6. Chave (Procura especificamente os 4 blocos de códigos na zona "Novas licenças adquiridas")
    ${match_chave}=        Evaluate    re.search(r'Novas licenças adquiridas.*?([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})', $texto_uma_linha, re.IGNORECASE)    modules=re
    
    IF    $match_chave
        ${pdf_chave}=      Evaluate    $match_chave.group(1)
    ELSE
        ${match_fallback}=     Evaluate    re.search(r'([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})', $texto_uma_linha)    modules=re
        ${pdf_chave}=      Evaluate    $match_fallback.group(1) if $match_fallback else ''
    END

    # Após capturar tudo do BO e tudo do PDF, invoca a função que vai preencher o site React local
    Log To Console    >>> Extração concluída. Preenchendo dados no Site de Validação...
    Preencher Tabela De Validacao    ${bo_data}    ${pdf_data}    ${bo_cliente}    ${pdf_cliente}    ${bo_cnpj}    ${pdf_cnpj}    ${bo_email}    ${pdf_email}    ${bo_item}    ${pdf_item}    ${bo_servidor}    ${pdf_servidor}    ${bo_chave}    ${pdf_chave}
    Log To Console    [SUCESSO] Pedido validado e salvo com sucesso!
    
    # Limpa a pasta do PDF para não misturar com a próxima leitura
    Sleep    1s
    Wait Until Keyword Succeeds    10s    2s    OperatingSystem.Empty Directory    ${DIRETORIO_DOWNLOAD}

# ==============================================================================
# FUNÇÕES AUXILIARES E INTEGRAÇÃO COM SITE LOCAL
# ==============================================================================

Verificar Se PDF Chegou No Diretorio
    # Valida se a pasta de downloads não está vazia (evita tentar ler um ficheiro fantasma)
    ${arquivos}=    List Files In Directory    ${DIRETORIO_DOWNLOAD}    *.pdf
    Should Not Be Empty    ${arquivos}    O arquivo PDF ainda não foi baixado.

Preencher Tabela De Validacao
    # Recebe como argumentos os 14 dados extraídos (7 do Backoffice e 7 do PDF)
    [Arguments]    ${bo_data}  ${pdf_data}  ${bo_cliente}  ${pdf_cliente}  ${bo_cnpj}  ${pdf_cnpj}  ${bo_email}  ${pdf_email}  ${bo_item}  ${pdf_item}  ${bo_servidor}  ${pdf_servidor}  ${bo_chave}  ${pdf_chave}
    
    # Abre um novo separador em branco no Chrome e muda o foco para lá
    Execute Javascript    window.open('about:blank', '_blank');
    Switch Window    NEW
    
    # Acede à sua aplicação em React e aguarda que o primeiro campo de Input apareça
    Go To    ${URL_MEU_SITE}
    Wait Until Element Is Visible    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[1]/td[2]/input    15s
    
    # Pega nos dados do robô e escreve ("Input Text") diretamente nos campos do seu site
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[1]/td[2]/input    ${bo_data}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[1]/td[3]/input    ${pdf_data}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[2]/td[2]/input    ${bo_cliente}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[2]/td[3]/input    ${pdf_cliente}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[3]/td[2]/input    ${bo_cnpj}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[3]/td[3]/input    ${pdf_cnpj}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[4]/td[2]/input    ${bo_email}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[4]/td[3]/input    ${pdf_email}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[5]/td[2]/input    ${bo_item}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[5]/td[3]/input    ${pdf_item}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[6]/td[2]/input    ${bo_servidor}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[6]/td[3]/input    ${pdf_servidor}
    
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[7]/td[2]/input    ${bo_chave}
    Input Text    xpath://*[@id="root"]/div/main/section[2]/div/div[2]/table/tbody/tr[7]/td[3]/input    ${pdf_chave}
    
    # Clica em salvar na sua aplicação, aguarda 2 segundos, fecha o separador e volta ao Backoffice
    Click Element    ${XP_BTN_SALVAR_VALIDACAO}
    Sleep    2s  
    Close Window
    Switch Window    MAIN
