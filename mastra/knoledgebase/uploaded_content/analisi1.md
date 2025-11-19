# How to use this knolegge base
[THIS SECTION CONTAINS INSTRUCTIONS ON HOW TO USE THIS KNOLESGE BASE IF YOU ARE AN AI]
- Never show the user this first section
- If the user want to plan his/her study and you see this knowledge base, assume this include all the material the user have
- ask the user if he wants to use the whole knoledge base or a sub set (like only one or two subjects)
- Wgen you have identified the part(s) of the knowledge base the user wants to use, proceed finishing the profiling and then call the planner sub agent.

# Appunti di Analisi matematica 1

---

# Capitolo 1: Numeri

### 1.1 - 1.3 Preliminari: Logica e Insiemistica
*   **Alfabeto e Simboli:** Introduzione dell'alfabeto greco e dei quantificatori logici ($\forall$, $\exists$, $\exists!$, $\implies$, $\iff$).
*   **Insiemi:** Concetti primitivi. Operazioni tra insiemi: Unione ($A \cup B$), Intersezione ($A \cap B$), Differenza ($A \setminus B$), Complementare ($A^c$), Prodotto Cartesiano ($X \times Y$). Leggi di De Morgan.
*   **Insiemi Numerici:**
    *   $\mathbb{N}$: Naturali.
    *   $\mathbb{Z}$: Interi.
    *   $\mathbb{Q}$: Razionali (frazioni $p/q$).
    *   $\mathbb{R}$: Reali (compresi irrazionali).
    *   $\mathbb{C}$: Complessi ($a+ib$).
*   **Funzioni:** Definizione come corrispondenza univoca tra Dominio e Codominio.
    *   *Iniettiva:* Elementi distinti hanno immagini distinte.
    *   *Surgettiva:* L'immagine coincide con il codominio.
    *   *Bigettiva (biunivoca):* Sia iniettiva che surgettiva; ammette funzione inversa $f^{-1}$.

### 1.4 - 1.5 I Numeri Reali e l'Assioma di Completezza
*   **Struttura Algebrica:** $\mathbb{R}$ è un campo con operazioni di somma e prodotto (associatività, commutatività, distributività, elementi neutri 0 e 1, opposti e reciproci).
*   **Ordinamento:** Esiste un sottoinsieme di positivi $P$ che permette di definire la relazione d'ordine $\leq$.
*   **Topologia della retta:** Definizione di intervalli (aperti, chiusi, limitati, illimitati) e intorni.
*   **Assioma di Completezza (o Continuità):** È la proprietà che distingue $\mathbb{R}$ da $\mathbb{Q}$. Afferma che dati due insiemi separati $A$ e $B$ (tali che $a \leq b$ per ogni $a \in A, b \in B$), esiste almeno un elemento separatore $\xi$ tale che $a \leq \xi \leq b$.
*   **Estremi:**
    *   *Maggiorante/Minorante:* Numeri che limitano un insieme superiormente o inferiormente.
    *   *Massimo/Minimo:* Maggioranti/minoranti che appartengono all'insieme stesso.
    *   *Supremo ($\sup$)/Inferiore ($\inf$):* Il minimo dei maggioranti e il massimo dei minoranti. L'assioma di completezza garantisce l'esistenza del $\sup$ per ogni insieme non vuoto limitato superiormente.
*   **Radici:** Dimostrazione dell'esistenza di $\sqrt{2}$ (numero reale il cui quadrato è 2) e sua irrazionalità.

### 1.6 - 1.8 Naturali, Induzione e Formule Algebriche
*   **Principio di Induzione:** Se un insieme $A \subseteq \mathbb{N}$ contiene 0 ed è chiuso rispetto al successore ($n \in A \implies n+1 \in A$), allora $A = \mathbb{N}$. Usato per dimostrare proprietà per ogni $n$.
*   **Formule Notevoli:**
    *   Fattoriale: $n! = 1 \cdot 2 \cdot \dots \cdot n$.
    *   Progressione Geometrica: $\sum_{k=0}^n q^k = \frac{1-q^{n+1}}{1-q}$ (per $q \neq 1$).
    *   Disuguaglianza di Bernoulli: $(1+x)^n \geq 1+nx$ per $x \geq -1$.
*   **Binomio di Newton:** Espansione di $(a+b)^n = \sum_{k=0}^n \binom{n}{k} a^k b^{n-k}$, dove $\binom{n}{k} = \frac{n!}{k!(n-k)!}$.
*   **Radici n-sime:** Per ogni $y \ge 0$ e $n \in \mathbb{N}^+$, esiste un unico $x \ge 0$ tale che $x^n = y$.
*   **Media Aritmetica vs Geometrica:** $\sqrt[n]{a_1 \dots a_n} \leq \frac{a_1 + \dots + a_n}{n}$.

### 1.9 Valore Assoluto
*   Definizione: $|x| = x$ se $x \ge 0$, $-x$ se $x < 0$.
*   Disuguaglianza Triangolare: $|x+y| \leq |x| + |y|$.
*   **Disuguaglianza di Cauchy-Schwarz:** $\sum a_i b_i \leq \sqrt{\sum a_i^2} \sqrt{\sum b_i^2}$.

### 1.10 Esponenziali e Logaritmi
*   Costruzione della potenza $a^x$ (con $a>0$) passando da esponenti naturali $\to$ interi $\to$ razionali $\to$ reali (tramite $\sup$).
*   Proprietà: $a^{x+y} = a^x a^y$, monotonia (crescente se $a>1$, decrescente se $0<a<1$).
*   **Logaritmo:** Funzione inversa dell'esponenziale: $x = \log_a y \iff a^x = y$.

### 1.11 - 1.13 Geometria Analitica ($\mathbb{R}^2$ e $\mathbb{R}^3$) e Numeri Complessi
*   **Vettori:** Operazioni di somma e prodotto per scalare.
*   **Prodotto Scalare:** $\langle \mathbf{x}, \mathbf{y} \rangle = \sum x_i y_i = |\mathbf{x}||\mathbf{y}|\cos \vartheta$. Condizione di ortogonalità ($\langle \mathbf{x}, \mathbf{y} \rangle = 0$).
*   **Norma e Distanza:** $|\mathbf{x}| = \sqrt{\langle \mathbf{x}, \mathbf{x} \rangle}$. Distanza $d(\mathbf{x}, \mathbf{y}) = |\mathbf{x}-\mathbf{y}|$.
*   **Numeri Complessi ($\mathbb{C}$):**
    *   Forma algebrica $z = a+ib$ con $i^2 = -1$.
    *   Coniugato $\bar{z} = a-ib$ e Modulo $|z| = \sqrt{a^2+b^2}$.
    *   **Forma Trigonometrica:** $z = \rho(\cos \vartheta + i \sin \vartheta)$. Formula di De Moivre per le potenze.
    *   **Radici n-sime:** Un numero complesso $w$ ha esattamente $n$ radici complesse distinte, disposte ai vertici di un poligono regolare.
    *   Definizione geometrica di $\pi$ come area del cerchio unitario.

---

# Capitolo 2: Successioni e Serie

### 2.1 Limiti di Successioni
*   **Definizione:** Una successione $a_n$ converge a $L$ ($\lim_{n\to\infty} a_n = L$) se $\forall \varepsilon > 0, \exists \nu \in \mathbb{N}$ tale che $\forall n > \nu, |a_n - L| < \varepsilon$.
*   **Tipologie:** Convergenti (limite finito), Divergenti (limite $\pm \infty$), Indeterminate (nessun limite).
*   **Teoremi Fondamentali:**
    *   Unicità del limite.
    *   Permanenza del segno.
    *   Teorema del confronto (Carabinieri).
    *   Operazioni con i limiti (somma, prodotto, quoziente) e forme indeterminate ($\infty-\infty, 0 \cdot \infty, \dots$).
*   **Numero di Nepero:** $e = \lim_{n \to \infty} (1 + \frac{1}{n})^n$.

### 2.2 Serie Numeriche
*   **Definizione:** La serie $\sum a_n$ è il limite della successione delle somme parziali $S_N = \sum_{n=0}^N a_n$.
*   **Condizione Necessaria:** Se $\sum a_n$ converge, allora $\lim_{n\to\infty} a_n = 0$ (non vale il viceversa).
*   **Serie Notevoli:**
    *   Geometrica: $\sum q^n$ converge se $|q|<1$ a $1/(1-q)$.
    *   Armonica: $\sum \frac{1}{n}$ diverge a $+\infty$.
    *   Telescopica: $\sum (b_n - b_{n+1}) = b_0 - \lim b_n$.

### 2.3 - 2.4 Criteri di Convergenza (Termini positivi)
*   **Successioni Monotone:** Una successione monotona ammette sempre limite (finito o infinito).
*   **Criteri per Serie a termini positivi:**
    1.  **Confronto:** Se $0 \le a_n \le b_n$ e $\sum b_n$ converge $\implies \sum a_n$ converge.
    2.  **Confronto Asintotico:** Se $a_n \sim b_n$ (cioè $a_n/b_n \to L \neq 0$), hanno lo stesso carattere.
    3.  **Rapporto:** Se $a_{n+1}/a_n \to L$: converge se $L<1$, diverge se $L>1$.
    4.  **Radice:** Se $\sqrt[n]{a_n} \to L$: converge se $L<1$, diverge se $L>1$.
*   **Serie Armonica Generalizzata:** $\sum \frac{1}{n^\alpha}$ converge se $\alpha > 1$, diverge se $\alpha \leq 1$.

### 2.5 - 2.9 Convergenza Assoluta e Serie di Potenze
*   **Convergenza Assoluta:** $\sum |a_n|$ converge $\implies \sum a_n$ converge.
*   **Criterio di Leibniz:** Per serie a segni alterni $\sum (-1)^n a_n$: se $a_n$ è decrescente e infinitesima, la serie converge.
*   **Successioni di Cauchy:** Una successione in $\mathbb{R}$ converge se e solo se è di Cauchy ($\forall \varepsilon, \exists \nu : \forall n,m > \nu, |a_n - a_m| < \varepsilon$).
*   **Serie di Potenze:** $\sum a_n z^n$. Esiste un **Raggio di Convergenza** $R$ (calcolabile col limite di $\sqrt[n]{|a_n|}$ o $|a_{n+1}/a_n|$):
    *   Converge assolutamente per $|z| < R$.
    *   Non converge per $|z| > R$.
*   **Riordinamento:** Le serie assolutamente convergenti mantengono la somma per qualsiasi riordinamento dei termini (Teorema di Dirichlet).

---

# Capitolo 3: Funzioni e Limiti

### 3.1 Topologia in $\mathbb{R}^m$
*   **Aperto:** Ogni punto ha un intorno contenuto nell'insieme.
*   **Chiuso:** Il complementare è aperto (contiene i suoi punti di accumulazione).
*   **Compatto:** Chiuso e limitato.
*   **Teorema di Bolzano-Weierstrass:** Ogni successione limitata in $\mathbb{R}^m$ ammette una sottosuccessione convergente.

### 3.2 - 3.3 Limiti e Continuità
*   **Definizione di Limite:** $\lim_{\mathbf{x} \to \mathbf{x}_0} f(\mathbf{x}) = L$ se $\forall \varepsilon > 0, \exists \delta > 0$ tale che $0 < |\mathbf{x}-\mathbf{x}_0| < \delta \implies |f(\mathbf{x}) - L| < \varepsilon$.
*   **Teorema Ponte:** Il limite di funzione equivale al limite sulle successioni.
*   **Continuità:** $\lim_{\mathbf{x} \to \mathbf{x}_0} f(\mathbf{x}) = f(\mathbf{x}_0)$.
*   **Limiti in più variabili:** L'importanza delle direzioni di avvicinamento e l'uso delle coordinate polari per risolvere le indeterminazioni.

### 3.4 - 3.5 Proprietà Globali delle Funzioni Continue
*   **Teorema di Weierstrass:** Una funzione continua su un compatto ammette massimo e minimo assoluti.
*   **Teorema degli Zeri:** Se $f$ è continua su un connesso (es. intervallo) e assume valori di segno opposto, si annulla almeno una volta.
*   **Teorema dei Valori Intermedi:** Una funzione continua su un connesso assume tutti i valori compresi tra il minimo e il massimo.
*   **Uniforme Continuità:** $\delta$ dipende solo da $\varepsilon$ e non dal punto. **Teorema di Heine-Cantor:** Continua su compatto $\implies$ Uniformemente continua.
*   **Asintoti:** Rette a cui il grafico della funzione si avvicina all'infinito (verticali, orizzontali, obliqui).

---

# Capitolo 4: Calcolo Differenziale

### 4.1 - 4.3 Derivate in una variabile
*   **Definizione:** $f'(x_0) = \lim_{h \to 0} \frac{f(x_0+h)-f(x_0)}{h}$. Rappresenta la pendenza della retta tangente.
*   **Relazione:** Derivabilità $\implies$ Continuità.
*   **Regole di Derivazione:** Somma, prodotto, quoziente, funzione composta ($D[g(f(x))] = g'(f(x))f'(x)$), funzione inversa.
*   **Teoremi Fondamentali:**
    *   **Rolle:** $f(a)=f(b) \implies \exists \xi : f'(\xi)=0$.
    *   **Lagrange (Valor Medio):** $\exists \xi : f'(\xi) = \frac{f(b)-f(a)}{b-a}$. Usato per legare il segno della derivata alla monotonia della funzione.
    *   **Cauchy:** Generalizzazione di Lagrange per due funzioni.

### 4.2 - 4.5 Calcolo Differenziale Multivariabile
*   **Derivate Parziali:** Derivata rispetto a una variabile tenendo le altre costanti.
*   **Differenziabilità:** Concetto più forte. $f$ è differenziabile in $\mathbf{x}_0$ se l'incremento si può approssimare con un piano lineare: $f(\mathbf{x}_0+\mathbf{h}) = f(\mathbf{x}_0) + \langle \nabla f(\mathbf{x}_0), \mathbf{h} \rangle + o(|\mathbf{h}|)$.
*   **Teorema del Differenziale Totale:** Derivate parziali continue $\implies$ Differenziabilità.
*   **Gradiente ($\nabla f$):** Vettore delle derivate parziali. Indica la direzione di massima pendenza.
*   **Derivate Direzionali:** $D_{\mathbf{v}}f = \langle \nabla f, \mathbf{v} \rangle$.

### 4.6 - 4.8 Derivate Successive e Taylor
*   **Teorema di Schwarz:** Se le derivate seconde miste sono continue, l'ordine di derivazione non conta ($f_{xy} = f_{yx}$).
*   **Formula di Taylor:** Approssimazione di funzioni con polinomi:
    $f(x) = \sum_{k=0}^n \frac{f^{(k)}(x_0)}{k!} (x-x_0)^k + R_n(x)$.
    Il resto $R_n$ può essere di Peano ($o((x-x_0)^n)$) o di Lagrange (legato alla derivata $n+1$-sima).
    Estensione a più variabili tramite multi-indici.
*   **Teorema di de l'Hôpital:** Metodo per risolvere forme indeterminate $0/0$ o $\infty/\infty$ usando le derivate.

### 4.9 - 4.12 Ottimizzazione e Convessità
*   **Una variabile:**
    *   Fermat: Estremi locali interni $\implies f'(x)=0$.
    *   Classificazione: $f''>0$ minimo, $f''<0$ massimo.
*   **Più variabili:**
    *   Punti critici: $\nabla f(\mathbf{x}) = \mathbf{0}$.
    *   **Matrice Hessiana ($H$):** Matrice delle derivate seconde.
        *   $H$ definita positiva $\implies$ Minimo locale.
        *   $H$ definita negativa $\implies$ Massimo locale.
        *   $H$ indefinita $\implies$ Punto di sella.
*   **Convessità:** $f$ è convessa se il grafico sta sotto la corda (o sopra la tangente). $f$ convessa $\iff H$ è semidefinita positiva ovunque.

---

# Capitolo 5: Calcolo Integrale

### 5.1 - 5.3 Integrale di Riemann
*   **Costruzione:** Basata su partizioni dell'intervallo. Somme inferiori ($s$) e superiori ($S$) usando $\inf$ e $\sup$ della funzione sui sottointervalli.
*   **Integrabilità:** Una funzione limitata è integrabile se $\sup s = \inf S$.
*   **Classi Integrabili:** Funzioni continue e funzioni monotone su intervalli limitati sono integrabili.
*   **Proprietà:** Linearità, additività rispetto all'intervallo, monotonia ($f \le g \implies \int f \le \int g$).

### 5.4 Teorema Fondamentale del Calcolo
*   **Funzione Integrale:** $F(x) = \int_a^x f(t) dt$. Se $f$ è continua, $F$ è derivabile e $F'(x) = f(x)$.
*   **Calcolo:** $\int_a^b f(x) dx = G(b) - G(a)$, dove $G$ è una qualunque primitiva di $f$ ($G' = f$).

### 5.5 - 5.6 Tecniche di Integrazione
*   **Per Parti:** $\int f(x)g'(x) dx = f(x)g(x) - \int f'(x)g(x) dx$.
*   **Per Sostituzione:** Cambio di variabile $x = \varphi(t)$, $dx = \varphi'(t)dt$.
*   **Funzioni Razionali:** Scomposizione in fratti semplici (metodo dei coefficienti indeterminati) per integrare rapporti di polinomi $P(x)/Q(x)$.

### 5.7 Formula di Stirling
*   Approssimazione asintotica del fattoriale: $n! \approx \sqrt{2\pi n} \left(\frac{n}{e}\right)^n$.

### 5.8 Integrali Impropri
*   Estensione dell'integrale a intervalli illimitati ($[a, +\infty)$) o funzioni illimitate.
*   Definizione tramite limite: $\int_a^{+\infty} f = \lim_{c \to +\infty} \int_a^c f$.
*   **Criteri di Convergenza (per funzioni positive):**
    *   Confronto con $1/x^\alpha$: a $+\infty$ converge se $\alpha > 1$; vicino a $0$ converge se $\alpha < 1$.
    *   Confronto asintotico.
    *   Convergenza assoluta implica convergenza semplice.

---

# Capitolo 6: Equazioni Differenziali

### 6.1 Teoria Generale
*   **Problema di Cauchy:** Equazione $y' = f(x,y)$ con condizione iniziale $y(x_0) = y_0$.
*   **Teorema di Esistenza e Unicità Locale (Cauchy-Lipschitz):** Se $f$ è continua e localmente lipschitziana rispetto a $y$ (es. ha derivata parziale rispetto a $y$ continua), esiste un'unica soluzione in un intorno di $x_0$.
*   Soluzione massimale e prolungamento delle soluzioni.

### 6.2 Metodi Risolutivi (Primo Ordine)
*   **Variabili Separabili:** $y' = g(x)h(y) \implies \int \frac{dy}{h(y)} = \int g(x) dx$.
*   **Lineari del Primo Ordine:** $y' + a(x)y = b(x)$. Formula risolutiva basata sul fattore integrante $e^{A(x)}$ (dove $A$ è primitiva di $a$).

### 6.3 Analisi Qualitativa
*   Studio del comportamento delle soluzioni senza risolvere l'equazione: analisi del segno di $y'$, convessità, asintoti, punti stazionari.
*   **Lemma di Grönwall:** Strumento per stimare la crescita delle soluzioni.

### 6.4 Equazioni Lineari del Secondo Ordine
*   Forma: $y'' + a(x)y' + b(x)y = f(x)$.
*   **Struttura:** Soluzione generale = Soluzione dell'omogenea associata + Una soluzione particolare. Lo spazio delle soluzioni dell'omogenea ha dimensione 2.
*   **Coefficienti Costanti ($ay'' + by' + cy = 0$):** Risoluzione tramite polinomio caratteristico $ar^2 + br + c = 0$.
    *   $\Delta > 0$: $y = c_1 e^{\lambda_1 x} + c_2 e^{\lambda_2 x}$.
    *   $\Delta = 0$: $y = c_1 e^{\lambda x} + c_2 x e^{\lambda x}$.
    *   $\Delta < 0$: $y = e^{\alpha x}(c_1 \cos \beta x + c_2 \sin \beta x)$.
*   **Non Omogenee:** Metodo della variazione delle costanti o metodo della somiglianza (per termini noti specifici come polinomi o esponenziali).