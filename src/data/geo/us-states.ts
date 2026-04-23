/**
 * US state data for programmatic geo-targeted SEO pages.
 *
 * Generates pages like /for/accounting/california targeting local long-tail
 * queries (e.g. "CPA software California", "accounting firm tools California").
 *
 * Top 30 states by professional services density + population. Expanding beyond
 * 30 risks thin content without additional state-specific research.
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
  {
    slug: "new-jersey",
    name: "New Jersey",
    abbreviation: "NJ",
    majorCities: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison"],
    cpaContext:
      "New Jersey Society of CPAs serves a dense mid-market economy tied to Wall Street commuter corridors. NJ has some of the highest state income tax rates and a unique Corporate Business Tax regime.",
    lawContext:
      "New Jersey State Bar Association with distinct IOLTA rules and strict continuing legal education requirements. Pharma and financial services drive concentrated legal work.",
    hrContext:
      "New Jersey has aggressive employment protections including paid family leave, earned sick leave, and salary history bans. Compliance burden comparable to New York.",
  },
  {
    slug: "wisconsin",
    name: "Wisconsin",
    abbreviation: "WI",
    majorCities: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine"],
    cpaContext:
      "Wisconsin Institute of CPAs serves manufacturing, dairy, and insurance sectors. Manufacturing and Agriculture Credit is a unique state incentive small firms must track.",
    lawContext:
      "State Bar of Wisconsin is one of only two mandatory integrated bars in the US. Distinct trust-accounting and unauthorized-practice rules.",
    hrContext:
      "Wisconsin has standard at-will employment with specific rules on final paycheck timing and non-compete enforceability. Manufacturing-heavy employer base.",
  },
  {
    slug: "minnesota",
    name: "Minnesota",
    abbreviation: "MN",
    majorCities: ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington"],
    cpaContext:
      "Minnesota Society of CPAs serves a strong Fortune 500 headquarters cluster (Target, UnitedHealth, 3M) and a robust mid-market. State has a four-tier progressive income tax.",
    lawContext:
      "Minnesota State Bar Association with mandatory CLE and distinct trust-accounting rules. Twin Cities host concentrated corporate and healthcare practices.",
    hrContext:
      "Minnesota has paid sick and safe time, strong pregnancy accommodation rules, and recently enacted paid family and medical leave. Active employment-law regime.",
  },
  {
    slug: "south-carolina",
    name: "South Carolina",
    abbreviation: "SC",
    majorCities: ["Charleston", "Columbia", "Mount Pleasant", "Rock Hill", "Greenville"],
    cpaContext:
      "South Carolina Association of CPAs serves manufacturing, tourism, and a growing retiree base. State has a six-tier income tax and unique manufacturing property tax rules.",
    lawContext:
      "South Carolina Bar regulates attorneys with strict trust-accounting and unauthorized-practice rules. Tourism, real estate, and construction litigation dominate.",
    hrContext:
      "South Carolina is a right-to-work state with minimal state-specific employment mandates. HR advisors commonly serve manufacturing and hospitality employers.",
  },
  {
    slug: "alabama",
    name: "Alabama",
    abbreviation: "AL",
    majorCities: ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"],
    cpaContext:
      "Alabama Society of CPAs serves aerospace, automotive manufacturing, and the port economy. State has flat-rate income tax and Business Privilege Tax quirks.",
    lawContext:
      "Alabama State Bar regulates attorneys with distinct IOLTA and trust-accounting rules. Concentrated tort and insurance-defense practice.",
    hrContext:
      "Alabama is a right-to-work state with minimal state-specific employment law. HR advisors commonly serve manufacturing, aerospace, and healthcare clients.",
  },
  {
    slug: "louisiana",
    name: "Louisiana",
    abbreviation: "LA",
    majorCities: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles"],
    cpaContext:
      "Society of Louisiana CPAs serves energy, maritime, and hospitality sectors. Louisiana's civil-law tradition creates unique trust and inheritance tax work.",
    lawContext:
      "Louisiana State Bar Association governs attorneys in the only US civil-law jurisdiction, with distinct substantive and procedural rules derived from the Napoleonic Code.",
    hrContext:
      "Louisiana is an at-will state with limited state-specific employment mandates. Oil and gas, maritime, and hospitality employers dominate the HR advisory market.",
  },
  {
    slug: "kentucky",
    name: "Kentucky",
    abbreviation: "KY",
    majorCities: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"],
    cpaContext:
      "Kentucky Society of CPAs serves bourbon, healthcare, and equine industries. State has a flat income tax and local occupational taxes that vary by county and city.",
    lawContext:
      "Kentucky Bar Association regulates attorneys with distinct trust-accounting rules. Bourbon-industry contracts and equine law are regional specialties.",
    hrContext:
      "Kentucky is a right-to-work state with standard federal-alignment employment law. Manufacturing and logistics (UPS Worldport) anchor the employer base.",
  },
  {
    slug: "oregon",
    name: "Oregon",
    abbreviation: "OR",
    majorCities: ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro"],
    cpaContext:
      "Oregon Society of CPAs serves technology, forestry, and winery sectors. No general sales tax but Oregon Corporate Activity Tax (CAT) applies to most mid-sized firms.",
    lawContext:
      "Oregon State Bar regulates attorneys with distinct trust-accounting and malpractice insurance requirements. Portland has concentrated technology and IP practice.",
    hrContext:
      "Oregon has robust employment protections including paid family and medical leave (Paid Leave Oregon), pay equity, and strict non-compete restrictions.",
  },
  {
    slug: "connecticut",
    name: "Connecticut",
    abbreviation: "CT",
    majorCities: ["Bridgeport", "New Haven", "Stamford", "Hartford", "Waterbury"],
    cpaContext:
      "Connecticut Society of CPAs serves insurance (Hartford), hedge funds (Stamford/Greenwich), and bioscience. State has a six-tier income tax and unique Pass-Through Entity Tax.",
    lawContext:
      "Connecticut Bar Association governs attorneys with strict trust-accounting rules. Insurance, financial services, and IP litigation dominate.",
    hrContext:
      "Connecticut has Paid Family and Medical Leave, pay transparency, and recreational cannabis workplace rules. Compliance burden among the higher in the Northeast.",
  },
  {
    slug: "oklahoma",
    name: "Oklahoma",
    abbreviation: "OK",
    majorCities: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond"],
    cpaContext:
      "Oklahoma Society of CPAs serves energy (oil and gas), aerospace, and agriculture. State has a six-tier progressive income tax and franchise tax obligations.",
    lawContext:
      "Oklahoma Bar Association regulates attorneys with distinct trust-accounting and mandatory CLE rules. Energy transactions and tribal law are specialties.",
    hrContext:
      "Oklahoma is a right-to-work state with minimal state-specific employment law beyond federal. HR advisors frequently serve energy and aerospace employers.",
  },
  {
    slug: "iowa",
    name: "Iowa",
    abbreviation: "IA",
    majorCities: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City"],
    cpaContext:
      "Iowa Society of CPAs serves agriculture, insurance (Des Moines), and biofuels. State has a tiered income tax transitioning to flat rate and unique agricultural tax credits.",
    lawContext:
      "Iowa State Bar Association regulates attorneys with distinct trust-accounting rules. Agricultural and insurance-industry law dominate.",
    hrContext:
      "Iowa has standard at-will employment with limited state-specific mandates. Meat processing, insurance, and agricultural employers anchor the HR advisory market.",
  },
  {
    slug: "mississippi",
    name: "Mississippi",
    abbreviation: "MS",
    majorCities: ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi"],
    cpaContext:
      "Mississippi Society of CPAs serves gaming, agriculture, and manufacturing. State has a three-tier income tax transitioning to flat rate and franchise tax obligations.",
    lawContext:
      "Mississippi Bar governs attorneys with strict trust-accounting and mandatory CLE rules. Tort litigation, gaming regulation, and agricultural law are specialties.",
    hrContext:
      "Mississippi is a right-to-work state with minimal state-specific employment law. HR advisors commonly serve gaming, manufacturing, and agricultural employers.",
  },
  {
    slug: "arkansas",
    name: "Arkansas",
    abbreviation: "AR",
    majorCities: ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro"],
    cpaContext:
      "Arkansas Society of CPAs serves retail (Walmart HQ), poultry processing (Tyson HQ), and logistics. State has a three-tier income tax and unique Arkansas sales tax regime.",
    lawContext:
      "Arkansas Bar Association regulates attorneys with distinct trust-accounting rules. Corporate work for Walmart and Tyson supply chains dominates NW Arkansas.",
    hrContext:
      "Arkansas is a right-to-work state with minimal state mandates. Retail, poultry, and logistics employers form the core HR advisory client base.",
  },
  {
    slug: "kansas",
    name: "Kansas",
    abbreviation: "KS",
    majorCities: ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka"],
    cpaContext:
      "Kansas Society of CPAs serves aerospace (Wichita), agriculture, and energy. State has a three-tier income tax and unique rules around passthrough entities.",
    lawContext:
      "Kansas Bar Association regulates attorneys with distinct trust-accounting requirements. Aerospace manufacturing and agricultural law are regional specialties.",
    hrContext:
      "Kansas is standard at-will employment with limited state-specific employment law. HR advisors commonly serve aerospace, agricultural, and manufacturing employers.",
  },
  {
    slug: "utah",
    name: "Utah",
    abbreviation: "UT",
    majorCities: ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem"],
    cpaContext:
      "Utah Association of CPAs serves tech (Silicon Slopes), outdoor recreation, and mining. State has a flat income tax and a unique Utah Revised Uniform Limited Liability Company Act.",
    lawContext:
      "Utah State Bar regulates attorneys and runs the nation's first regulatory sandbox allowing non-lawyer ownership of law firms. Tech transactions and IP dominate.",
    hrContext:
      "Utah is a right-to-work state with moderate state-specific employment law. Silicon Slopes tech employers drive much of the HR advisory market.",
  },
];

export function getState(slug: string): State | undefined {
  return PRIORITY_STATES.find((s) => s.slug === slug);
}
