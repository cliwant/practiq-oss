/**
 * US state data for programmatic geo-targeted SEO pages.
 *
 * Generates pages like /for/accounting/california targeting local long-tail
 * queries (e.g. "CPA software California", "accounting firm tools California").
 *
 * Only top 15 states by professional services density included — adding all 50
 * creates thin content risk.
 */

export interface State {
  slug: string;
  name: string;
  abbreviation: string;
  majorCities: string[];
  cpaContext?: string; // state-specific context for CPA vertical
  lawContext?: string;
  hrContext?: string;
}

export const PRIORITY_STATES: State[] = [
  {
    slug: "california",
    name: "California",
    abbreviation: "CA",
    majorCities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"],
    cpaContext:
      "California has the most small accounting firms of any state (over 6,500 registered with CalCPA). State-specific considerations include California franchise tax, LLC fees, sales tax nexus, and passthrough entity tax (PTET) elections.",
    lawContext:
      "California has over 200,000 active attorneys regulated by the State Bar of California. Small firms must navigate California Rules of Professional Conduct, mandatory MCLE, and client trust accounting per Rule 1.15.",
    hrContext:
      "California has the most aggressive employment law regime in the US. HR advisors serving California employers track at-will limits, meal/rest break compliance, wage statement requirements, and recent legislation like SB-1162 (pay transparency).",
  },
  {
    slug: "texas",
    name: "Texas",
    abbreviation: "TX",
    majorCities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
    cpaContext:
      "Texas has no state income tax but requires franchise tax filings. Texas Society of CPAs is the second-largest state society. Small firms benefit from a business-friendly regulatory environment.",
    lawContext:
      "Texas has approximately 100,000 licensed attorneys through the State Bar of Texas. Trust accounting rules follow IOLTA standards similar to most states.",
    hrContext:
      "Texas is an at-will state with minimal employment regulations compared to California. Still, multi-state employers operating in Texas must navigate state-specific unemployment, workers comp, and wage payment rules.",
  },
  {
    slug: "new-york",
    name: "New York",
    abbreviation: "NY",
    majorCities: ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
    cpaContext:
      "New York has specific CPA licensure rules through NYSED. Small firms in NYC face unusually high client density and concentrated mid-market work.",
    lawContext:
      "New York is home to many of the largest law firms in the world, but also thousands of boutique firms. The Unified Court System and New York State Bar have distinct ethics and filing rules.",
    hrContext:
      "New York state and NYC have separate employment law frameworks. NYC has additional protections like the Fair Workweek Law, salary transparency requirements, and specific anti-discrimination provisions.",
  },
  {
    slug: "florida",
    name: "Florida",
    abbreviation: "FL",
    majorCities: ["Miami", "Tampa", "Orlando", "Jacksonville", "St. Petersburg"],
    cpaContext:
      "Florida has no state income tax. The Florida Institute of CPAs is one of the largest state societies. Small firms serve a growing population of retirees and snowbirds with specific tax planning needs.",
    lawContext:
      "The Florida Bar regulates approximately 110,000 attorneys. Florida has unique real estate law, estate planning, and elder law considerations.",
    hrContext:
      "Florida employment law is generally employer-friendly, though federal protections still apply. HR advisors in Florida often serve hospitality, healthcare, and real estate clients.",
  },
  {
    slug: "illinois",
    name: "Illinois",
    abbreviation: "IL",
    majorCities: ["Chicago", "Aurora", "Naperville", "Rockford", "Joliet"],
    cpaContext:
      "Illinois CPA Society serves a strong Chicago-based mid-market. State income tax and Cook County-specific rules add complexity.",
    lawContext:
      "The Illinois State Bar regulates attorneys through the Attorney Registration and Disciplinary Commission. Chicago is a major legal market.",
    hrContext:
      "Illinois has the Secure Choice retirement savings program requirement for employers without retirement plans. Chicago has additional minimum wage and paid sick leave ordinances.",
  },
  {
    slug: "pennsylvania",
    name: "Pennsylvania",
    abbreviation: "PA",
    majorCities: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading"],
    cpaContext:
      "Pennsylvania Institute of CPAs has a strong member base. State has unique local earned income tax that varies by municipality.",
    lawContext:
      "The Pennsylvania Bar Association is one of the oldest in the US. Philadelphia and Pittsburgh are the main legal markets.",
    hrContext:
      "Pennsylvania wage laws and unemployment requirements differ from neighboring states. Small firms must navigate local tax for remote employees.",
  },
  {
    slug: "georgia",
    name: "Georgia",
    abbreviation: "GA",
    majorCities: ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens"],
    cpaContext:
      "Georgia Society of CPAs anchored by Atlanta's financial services industry. State has relatively business-friendly tax environment.",
    lawContext:
      "State Bar of Georgia regulates licensure with distinct rules around trust accounts and professional responsibility.",
    hrContext:
      "Georgia is at-will with few state-specific mandates. HR advisors often serve Atlanta's film, tech, and healthcare industries.",
  },
  {
    slug: "ohio",
    name: "Ohio",
    abbreviation: "OH",
    majorCities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
    cpaContext:
      "Ohio Society of CPAs serves strong manufacturing and insurance industries. Commercial Activity Tax (CAT) unique to Ohio.",
    lawContext:
      "Ohio has a three-court system requiring attorneys to navigate state, federal, and municipal court rules. Multiple regional bar associations.",
    hrContext:
      "Ohio has standard federal-alignment employment law with a few state-specific rules on wage payment and workers comp.",
  },
  {
    slug: "north-carolina",
    name: "North Carolina",
    abbreviation: "NC",
    majorCities: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem"],
    cpaContext:
      "NC Association of CPAs serves a growing banking and tech sector (Charlotte, Research Triangle). State has 4.75% flat income tax (2026).",
    lawContext:
      "State Bar of NC regulates attorneys with distinct trust accounting and IOLTA requirements.",
    hrContext:
      "North Carolina is at-will with minimal state mandates. HR advisors in the Research Triangle often serve biotech and tech employers.",
  },
  {
    slug: "michigan",
    name: "Michigan",
    abbreviation: "MI",
    majorCities: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing"],
    cpaContext:
      "Michigan Association of CPAs serves automotive, healthcare, and manufacturing. Small firms often specialize in auto industry supply chain.",
    lawContext:
      "State Bar of Michigan with specific rules on trust accounts. Detroit has a concentrated legal market.",
    hrContext:
      "Michigan has standard employment law with some specific rules on paid medical leave that vary by year.",
  },
  {
    slug: "washington",
    name: "Washington",
    abbreviation: "WA",
    majorCities: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"],
    cpaContext:
      "Washington has no state income tax but has Business and Occupation (B&O) tax. WSCPA serves the state's tech-heavy economy.",
    lawContext:
      "Washington State Bar Association with specific rules around trust accounts and licensing via UBE.",
    hrContext:
      "Washington has strong state-level employment law including paid family leave, paid sick leave, and specific overtime rules. Seattle has additional ordinances.",
  },
  {
    slug: "virginia",
    name: "Virginia",
    abbreviation: "VA",
    majorCities: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Arlington"],
    cpaContext:
      "Virginia Society of CPAs serves Northern Virginia's government contractor sector heavily. Federal contracting expertise is a niche for VA CPAs.",
    lawContext:
      "Virginia State Bar with distinct rules around unauthorized practice of law. Northern Virginia concentrated in federal contracts work.",
    hrContext:
      "Virginia has traditional employment law with some recent progressive additions like non-compete restrictions and minimum wage increases.",
  },
  {
    slug: "arizona",
    name: "Arizona",
    abbreviation: "AZ",
    majorCities: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale"],
    cpaContext:
      "Arizona Society of CPAs serves strong construction, real estate, and tourism sectors. Flat income tax (2.5%) attracts retirees.",
    lawContext:
      "State Bar of Arizona has distinct rules on trust accounts. Growth in family law and estate planning from retiree population.",
    hrContext:
      "Arizona has relatively minimal state employment law beyond federal requirements. Right-to-work state.",
  },
  {
    slug: "massachusetts",
    name: "Massachusetts",
    abbreviation: "MA",
    majorCities: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
    cpaContext:
      "MSCPA serves biotech, higher education, and financial services. Boston has high density of boutique firms serving mid-market.",
    lawContext:
      "Massachusetts Bar Association with specific rules around trust accounting and Board of Bar Overseers complaints handling.",
    hrContext:
      "Massachusetts has some of the strongest employment protections outside California. Paid Family and Medical Leave (PFML), pay equity, and specific non-compete rules.",
  },
  {
    slug: "colorado",
    name: "Colorado",
    abbreviation: "CO",
    majorCities: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood"],
    cpaContext:
      "Colorado Society of CPAs serves cannabis, tech, and energy sectors. Unique cannabis accounting expertise is a niche.",
    lawContext:
      "Colorado Bar Association with specific rules on trust accounting. Growth in cannabis law and tech transactions.",
    hrContext:
      "Colorado has Equal Pay for Equal Work Act requiring pay transparency. Cannabis-industry HR is a specialized niche.",
  },
];

export function getState(slug: string): State | undefined {
  return PRIORITY_STATES.find((s) => s.slug === slug);
}
