"""Builds case-studies/*.html. Run from the site root: python3 tools/build_case_studies.py
Risk-series pages are generated from the project READMEs (set RISK_SRC); the three AI pages
use only facts already published on this site."""
import html, os, re, sys
import markdown

SRC = os.environ.get("RISK_SRC", "/home/claude/risk-resilience-portfolio")
OUT = "case-studies"
GH = "https://github.com/suhas102/"

def esc(s): return html.escape(s, quote=True)

PAGES = [
 dict(slug="self-healing-rag", title="Self-healing RAG and answer validation pipeline", kicker="Keele University, February to June 2026",
  lede="A retrieval-augmented generation pipeline that checks its own answers, retries with a better query when they are unsupported, and refuses safely rather than guessing.",
  meta=[("Stack","Python, LangGraph, vector store"),("Scale","5,000 documents, 12,000 chunks"),("Code","self-healing-rag-pipeline")], repo="self-healing-rag-pipeline",
  sections=[("The problem","<p>A basic RAG system retrieves passages and generates an answer, and has no way to notice when the answer is not supported by what it retrieved. In production that shows up as confident, ungrounded text.</p>"),
   ("What I built","<p>A LangGraph workflow with explicit stages for retrieval, generation, hallucination detection, query reformulation and fallback handling. A critic agent compares each answer with the retrieved passages. If the answer is unsupported, the graph reformulates the query and retrieves again. If it still cannot be supported, the system returns a safe insufficient-information response.</p><p>The corpus was 5,000 documents split into 12,000 vector chunks.</p>"),
   ("Why it is built this way","<p>Putting the check inside the graph, rather than after it, makes every decision visible: which passages were used, why an answer was rejected, and what the retry changed. That is what you need to debug and to evaluate the system.</p>"),
   ("Try the idea","<p>The box at the top of the home page is a tiny version of the same pattern: it retrieves from this site, checks that the question is supported, and says so when it is not.</p>")]),
 dict(slug="llm-guardrails-gateway", title="Configurable LLM safety guardrails gateway", kicker="Keele University, June to August 2026",
  lede="Middleware between an application and a language model that enforces safety and compliance policies on both what goes in and what comes out.",
  meta=[("Stack","Python, YAML, JSON Schema"),("Policies","30"),("Testing","2,000 adversarial prompts"),("Code","llm-guardrails-gateway")], repo="llm-guardrails-gateway",
  sections=[("The problem","<p>Prompt injection, jailbreaks, personal data in prompts, toxic output and malformed structured output are separate failures, and application teams rarely want to rebuild checks for each one.</p>"),
   ("What I built","<p>A gateway with a YAML policy engine. Policies are configuration, not code, so they can be reviewed, versioned and changed without redeploying. It validates input and output, enforces JSON schemas and topic relevance, and triggers automatic retries or safe fallbacks when validation fails.</p><p>It was validated on 2,000 adversarial prompts covering prompt injection, jailbreaks, PII leakage, toxicity, off-topic responses and schema violations.</p>"),
   ("Why policies as configuration","<p>The people who decide what is acceptable are often not the people who write the application. Keeping policies in a readable file lets them be reviewed and audited on their own.</p>"),
   ("Try the idea","<p>The home-page console runs a small browser version of the input checks: injection, jailbreak, secrets, toxicity and PII redaction.</p>")]),
 dict(slug="f1-cognitive-load", title="Testing, not assuming: cognitive load proxies in F1 telemetry", kicker="MSc dissertation, Keele University, June to August 2026",
  lede="Whether signals such as throttle smoothness really track a driver's cognitive load, or just reflect the circuit, the car or the driver.",
  meta=[("Data","61 race weekends, 28 drivers, 65,000+ laps"),("Best model","XGBoost, ROC-AUC 0.740"),("Delivered as","CLI and Tkinter tool"),("Code","f1-cognitive-load-thesis")], repo="f1-cognitive-load-thesis",
  sections=[("The question","<p>Telemetry-derived measures are often used as proxies for how hard a driver is working mentally. A proxy is only useful if it measures that, and not something that varies with the track, the car or the driver.</p>"),
   ("Approach","<p>I built a confound-controlled analysis using pandas and scikit-learn, with logistic regression, random forest and XGBoost, and used SHAP to see which signals drove predictions. Data covered 61 race weekends, 28 drivers and over 65,000 laps.</p>"),
   ("Result","<p>XGBoost reached a ROC-AUC of 0.740. The model was delivered as a queryable reporting tool with command-line and Tkinter interfaces so results can be explored without code.</p>"),
   ("What it shows about my method","<p>I treat a proxy as a hypothesis to test. Controlling for confounds before trusting a signal is the same discipline I apply to model monitoring and evaluation.</p>")]),
]

RISK = [
 ("kri-early-warning","p1_kri_early_warning","KRI early-warning model","kri-early-warning-model","Synthetic operations data","kri_dashboard.png","Hold-out forecast and alert results","P1","Forecasting, gradient boosting"),
 ("incident-themes-nlp","p2_incident_nlp","Incident themes with NLP","incident-themes-nlp","Synthetic incident records","incident_themes.png","Theme trends across eight quarters","P2","TF-IDF, NMF topic modelling"),
 ("dependency-network","p3_dependency_network","Dependency network analysis","dependency-network-analysis","Fictional 20-component process","dependency_map.png","Dependency map of the delivery process","P3","Graph analysis, NetworkX"),
 ("disruption-monte-carlo","p4_disruption_montecarlo","Monte Carlo disruption simulation","disruption-monte-carlo-simulation","Illustrative assumptions","montecarlo_results.png","Simulated loss with and without a plan","P4","Monte Carlo simulation"),
 ("ai-model-risk-monitoring","p5_ai_risk_assessment","AI model risk monitoring","ai-model-risk-monitoring","Synthetic weekly demand","ai_drift_monitoring.png","Drift detection and forecast error","P5","Drift tests, fallback model"),
 ("bia-continuity-plan","p6_bia_continuity_plan","Business impact analysis and continuity plan","Risk-resilience-portfolio","Fictional retailer","", "", "P6","Business impact analysis"),
]

def split_readme(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"^# .*\n", "", t, count=1)
    t = re.sub(r"\n\nFiles: .*$", "", t.strip(), flags=re.S)
    t = re.sub(r"\(\.\./p3_dependency_network/README\.md\)", "(dependency-network.html)", t)
    t = re.sub(r"\(BIA_and_Continuity_Plan_Same_Day_Delivery\.pdf\)", "(https://github.com/suhas102/Risk-resilience-portfolio/blob/main/p6_bia_continuity_plan/BIA_and_Continuity_Plan_Same_Day_Delivery.pdf)", t)
    t = re.sub(r"\bP3\b", "the dependency network project", t)
    t = re.sub(r"\(see P5\)", "(see the AI model risk monitoring project)", t)
    paras = re.split(r"\n\n(?=\*\*)", t)
    secs, lead = [], None
    for p in paras:
        m = re.match(r"\*\*(.+?)\.?\*\*\.?\s*(.*)", p, flags=re.S)
        if m and len(m.group(1)) < 100:
            body = m.group(2).strip()
            secs.append((m.group(1).strip().rstrip(".").replace(" (be honest about these)",""), body))
        else:
            secs.append((None, p))
    return secs

def risk_pages():
    out = []
    for slug, d, title, repo, data, img, cap, tag, method in RISK:
        secs = split_readme(f"{SRC}/{d}/README.md")
        sections, lede = [], ""
        for h, b in secs:
            if h is None:
                lede = lede or b.split("\n")[0]
                continue
            b = re.sub(r"([^\n-])\n((?:\d+\.|-) )", r"\1\n\n\2", b)
            sections.append((h, markdown.markdown(b, extensions=["tables"])))
        if slug == "bia-continuity-plan":
            lede = "A seven-page business impact analysis and continuity plan for a fictional same-day delivery service: how bad a disruption gets over time, how fast each step must recover, and what to do meanwhile."
            sections = sections[1:]
        else:
            first = sections[0][1]
            lede = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", first)).strip()
            sections = sections[1:]
        url = GH + repo + ("/tree/main/p6_bia_continuity_plan" if slug == "bia-continuity-plan" else "")
        out.append(dict(slug=slug, title=title, kicker="Reliability engineering series", lede=lede,
            meta=[("Method", method), ("Data", data), ("Code", "Document" if slug == "bia-continuity-plan" else repo)],
            repo=repo, url=url, sections=sections, img=img, cap=cap))
    return out

def render(pg, prev, nxt):
    url = pg.get("url", GH + pg["repo"])
    meta = "".join(f'<div class="case-meta-item"><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in pg["meta"])
    secs = "".join(f'<section class="case-section"><h2>{esc(h)}</h2><div class="case-section-body">{b}</div></section>' for h, b in pg["sections"])
    fig = ""
    if pg.get("img"):
        fig = f'<figure class="case-figure"><img src="../assets/img/{pg["img"]}" alt="{esc(pg["cap"])}" loading="lazy"><figcaption>{esc(pg["cap"])}. Synthetic or illustrative data.</figcaption></figure>'
    nav = []
    if prev: nav.append(f'<a href="{prev["slug"]}.html">Previous: {esc(prev["title"])}</a>')
    if nxt: nav.append(f'<a href="{nxt["slug"]}.html">Next: {esc(nxt["title"])}</a>')
    return f'''<!DOCTYPE html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(pg["title"])} | Suhas Suresha</title>
<meta name="description" content="{esc(pg["lede"])}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..600&display=swap">
<link rel="stylesheet" href="../assets/css/site.css">
<script>try{{var s=localStorage.getItem("theme"),d=matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",s||(d?"dark":"light"))}}catch(e){{}}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap site-header-inner"><a class="wordmark" href="../index.html">Suhas Suresha</a>
<nav class="nav" aria-label="Main"><a class="nav-link" href="../index.html#work">Work</a><a class="nav-link" href="../index.html#reliability">Reliability</a><a class="nav-link" href="../index.html#github">GitHub</a><a class="nav-link" href="../index.html#contact">Contact</a></nav>
<div class="header-actions"><a class="btn btn-small header-cv" href="../assets/Suhas-Suresha-CV.pdf">Download CV</a></div></div></header>
<main id="main"><article class="case"><div class="wrap">
<a class="case-back" href="../index.html#work">Back to all work</a>
<p class="case-kicker">{esc(pg["kicker"])}</p>
<h1 class="case-title">{esc(pg["title"])}</h1>
<p class="case-lede">{esc(pg["lede"])}</p>
<dl class="case-meta">{meta}<div class="case-meta-item"><dt>Source</dt><dd><a href="{url}">View on GitHub</a></dd></div></dl>
{fig}
<div class="case-body">{secs}</div>
<nav class="case-next" aria-label="More case studies">{"".join(nav)}</nav>
</div></article></main>
<footer class="site-footer"><div class="wrap footer-inner"><span>Suhas Suresha</span><nav class="footer-links" aria-label="Footer"><a href="https://github.com/suhas102">GitHub</a><a href="https://www.linkedin.com/in/suhas-suresha-b54678355/">LinkedIn</a><a href="mailto:suhasuresha8@gmail.com">Email</a></nav></div></footer>
</body></html>'''

def main():
    pages = PAGES + risk_pages()
    os.makedirs(OUT, exist_ok=True)
    for i, pg in enumerate(pages):
        prev = pages[i-1] if i else None
        nxt = pages[i+1] if i < len(pages)-1 else None
        open(f"{OUT}/{pg['slug']}.html", "w", encoding="utf-8").write(render(pg, prev, nxt))
    print("built", len(pages), "pages")
main()
