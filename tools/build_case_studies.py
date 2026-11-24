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

STATS = {
 "self-healing-rag": [("5,000","documents in the corpus"),("12k","vector chunks indexed"),("1","critic agent in the loop")],
 "llm-guardrails-gateway": [("30","YAML safety policies"),("2,000","adversarial prompts tested"),("2","directions checked: input and output")],
 "f1-cognitive-load": [("61","race weekends"),("65k+","laps analysed"),("0.740","best ROC-AUC (XGBoost)")],
 "kri-early-warning": [("15%","lower forecast error than naive baseline"),("49","hold-out weeks"),("2","weeks of warning")],
 "incident-themes-nlp": [("506","synthetic incident records"),("8","quarters of data"),("+9.1","points of share for the fastest-growing theme")],
 "dependency-network": [("20","components modelled"),("11","single points of failure"),("4","recovery-time conflicts")],
 "disruption-monte-carlo": [("100k","simulated outages"),("46%>8%","chance of exceeding 4 hours, no plan vs plan"),("13%>0.4%","chance of exceeding GBP 3m")],
 "ai-model-risk-monitoring": [("8","risks in the register"),("~8","weeks drift detection lags the change"),("14.0>10.1","units/week error, model alone vs with fallback")],
 "bia-continuity-plan": [("7","pages"),("7","disruption scenarios covered"),("4","recovery-time conflicts found")],
}
SVG = {
 "self-healing-rag": '<svg viewBox="0 0 240 44"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="12" width="44" height="20" rx="4"/><rect x="66" y="12" width="44" height="20" rx="4"/><rect x="128" y="12" width="44" height="20" rx="4"/><rect x="190" y="12" width="44" height="20" rx="4"/><path d="M48 22h18M110 22h18M172 22h18"/><path class="loop" d="M150 12C150 2 88 2 88 12"/></g><g font-size="9" fill="currentColor" text-anchor="middle"><text x="26" y="25">fetch</text><text x="88" y="25">write</text><text x="150" y="25">critic</text><text x="212" y="25">answer</text></g></svg>',
 "llm-guardrails-gateway": '<svg viewBox="0 0 240 44"><g>' + "".join('<rect class="sq" x="%s" y="%s" width="12" height="12" rx="2" style="--d:%sms"/>' % (4+(i%15)*15.5, 6+(i//15)*17, i*40) for i in range(30)) + '</g></svg>',
 "f1-cognitive-load": '<svg viewBox="0 0 240 44"><path class="trace" fill="none" stroke="currentColor" stroke-width="1.6" d="M2 34C16 34 18 8 32 8S44 34 58 34 64 14 78 14 86 36 100 36 110 6 124 6 132 30 146 30 156 10 170 10 178 32 192 32 202 16 216 16 228 28 238 28"/></svg>',
 "disruption-monte-carlo": '<svg viewBox="0 0 240 44"><g fill="currentColor">' + "".join('<rect class="bar" x="%s" y="%s" width="9" height="%s" rx="1" style="--d:%sms"/>' % (6+i*12, 42-h, h, i*30) for i,h in enumerate([38,30,24,19,15,12,10,8,6,5,4,3,3,2,2,2,1,1,1,1])) + '</g><path d="M96 2v40" stroke="currentColor" stroke-dasharray="3 3"/></svg>',
 "kri-early-warning": '<svg viewBox="0 0 240 44"><g stroke="currentColor" fill="none" stroke-width="1.5"><path d="M2 36L30 30 60 33 90 24 120 26 150 16 180 10 210 14 238 6"/><path stroke-dasharray="3 3" opacity=".6" d="M2 14H238"/></g><circle cx="238" cy="6" r="3.5" fill="#cf222e"/></svg>',
 "ai-model-risk-monitoring": '<svg viewBox="0 0 240 44"><g stroke="currentColor" fill="none" stroke-width="1.5"><path d="M2 34 60 33 120 34 140 30 170 20 200 12 238 8"/><path stroke-dasharray="3 3" opacity=".6" d="M120 2v40"/></g><text x="124" y="12" font-size="9" fill="currentColor">drift</text></svg>',
 "dependency-network": '<svg viewBox="0 0 240 44"><g stroke="currentColor" fill="none" stroke-width="1.3"><path d="M120 8 40 22M120 8 120 22M120 8 200 22M40 22 70 38M40 22 20 38M120 22 120 38M200 22 170 38M200 22 220 38"/></g><g fill="currentColor"><circle cx="120" cy="8" r="4"/><circle cx="40" cy="22" r="4"/><circle cx="120" cy="22" r="4" fill="#cf222e"/><circle cx="200" cy="22" r="4"/><circle cx="70" cy="38" r="3"/><circle cx="20" cy="38" r="3"/><circle cx="120" cy="38" r="3"/><circle cx="170" cy="38" r="3"/><circle cx="220" cy="38" r="3"/></g></svg>',
 "incident-themes-nlp": '<svg viewBox="0 0 240 44"><g fill="currentColor">' + "".join('<rect class="bar" x="%s" y="%s" width="22" height="%s" rx="2" style="--d:%sms"/>' % (8+i*38, 42-h, h, i*60) for i,h in enumerate([10,16,22,28,34,38])) + '</g></svg>',
 "bia-continuity-plan": '<svg viewBox="0 0 240 44"><g fill="currentColor">' + "".join('<rect class="bar" x="%s" y="%s" width="18" height="%s" rx="2" style="--d:%sms"/>' % (10+i*58, 42-h, h, i*80) for i,h in enumerate([8,18,30,40])) + '</g><g font-size="9" fill="currentColor" text-anchor="middle"><text x="19" y="8">1h</text><text x="77" y="8">4h</text><text x="135" y="8">8h</text><text x="193" y="8">24h</text></g></svg>',
}

def render(pg, prev, nxt):
    url = pg.get("url", GH + pg["repo"])
    meta = "".join(f'<span><b>{esc(k)}:</b> {esc(v)}</span>' for k, v in pg["meta"])
    secs = "".join(f'<h2>{esc(h)}</h2>{b}' for h, b in pg["sections"])
    ach = "".join(f'<div class="ach-item" role="listitem"><div class="ach-ring" style="font-size:{13 if len(n)>5 else 17}px">{esc(n)}</div><span>{esc(l)}</span></div>' for n, l in STATS[pg["slug"]])
    ach = ach.replace("&gt;", "&rarr;")
    fig = ""
    if pg.get("img"):
        fig = f'<figure class="case-fig"><img src="../assets/img/{pg["img"]}" alt="{esc(pg["cap"])}" loading="lazy"><figcaption>{esc(pg["cap"])}. Synthetic or illustrative data.</figcaption></figure>'
    guard = '<div class="needs-js"><h2>Try it</h2><p>These are the same kinds of input checks the gateway runs, in your browser.</p><div class="guard" data-guard></div></div>' if pg["slug"] == "llm-guardrails-gateway" else ""
    nav = []
    if prev: nav.append(f'<a href="{prev["slug"]}.html">Previous: {esc(prev["title"])}</a>')
    if nxt: nav.append(f'<a href="{nxt["slug"]}.html">Next: {esc(nxt["title"])}</a>')
    scripts = '<script src="../assets/js/main.js" defer></script>' + ('<script src="../assets/js/gateway.js" defer></script><script src="../assets/js/guard.js" defer></script>' if guard else "")
    return f'''<!DOCTYPE html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(pg["title"])} | Suhas Suresha</title>
<meta name="description" content="{esc(pg["lede"][:200])}">
<link rel="stylesheet" href="../assets/css/site.css">
<link rel="stylesheet" href="../assets/css/gh.css">
<script>try{{var s=localStorage.getItem("theme"),d=matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",s||(d?"dark":"light"))}}catch(e){{}}document.documentElement.className+=" js"</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="gh-top"><div class="gh-top-inner"><a class="crumb" href="../index.html#overview">suhas102 <span>/ portfolio</span></a><span class="spacer"></span><a class="btn btn-small" href="../assets/Suhas-Suresha-CV.pdf">Download CV</a><button class="icon-btn needs-js" id="theme-toggle" type="button" aria-label="Switch colour theme"></button></div></header>
<main id="main" class="case-wrap">
<p class="crumbs"><a href="../index.html#overview">suhas102</a> / <a href="../index.html#repositories">projects</a> / <b>{esc(pg["slug"])}</b></p>
<div class="case-head"><h1>{esc(pg["title"])}</h1><p class="case-lede">{esc(pg["lede"])}</p>
<p class="case-meta2"><span><b>{esc(pg["kicker"])}</b></span>{meta}<span><a href="{url}">View on GitHub</a></span></p></div>
<div class="pin-viz" aria-hidden="true">{SVG[pg["slug"]]}</div>
<div class="ach" role="list" style="grid-template-columns:repeat(3,minmax(0,1fr))">{ach}</div>
{fig}
<div class="box case-readme"><div class="box-head">{esc(pg["slug"])} / README.md</div><div class="box-body">{secs}{guard}</div></div>
<nav class="case-nav2" aria-label="More case studies">{"".join(nav)}</nav>
</main>
<footer class="gh-foot"><span>Suhas Suresha</span><span><a href="../index.html">Home</a> &middot; <a href="https://github.com/suhas102">GitHub</a> &middot; <a href="https://www.linkedin.com/in/suhas-suresha-b54678355/">LinkedIn</a> &middot; <a href="mailto:suhasuresha8@gmail.com">Email</a></span></footer>
{scripts}
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
