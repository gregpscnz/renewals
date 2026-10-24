/* question model shared with the renewal capture app */
function Q(id,label,type,o){o=o||{};o.id=id;o.label=label;o.type=type;return o;}
var YN='yn';
var CLIENT=[
  Q('name','Client or business name','text',{full:true,ph:'As shown on the policy'}),
  Q('dob','Date of birth','date',{seg:'domestic'}),
  Q('address','Site or premises address','text',{full:true,addr:true,hint:'Start typing the number and street, then pick the address. You can also type it in by hand.'}),
  Q('contact','Contact person','text'),
  Q('dob2','Date of birth of the partner or joint policyholder','date',{seg:'domestic'}),
  Q('phone','Phone','tel'),
  Q('email','Client email','email'),
  Q('renewal','Renewal date','date'),
  Q('policyNo','Current policy number(s)','text'),
  Q('insurer','Current insurer','text'),
  Q('premium','Expiring annual premium','num',{hint:'As shown on the current schedule.'}),
  Q('preparedBy','Review completed by','text',{hint:'Filled from your staff details. Change it here for this review only.'}),
  Q('preparedRole','Role','text'),
  Q('preparedPhone','Mobile or phone','tel'),
  Q('preparedEmail','Staff email','email',{hint:'Shown on the submission. Leave blank to use the default contact email.'})
];
var PROFILE={
  commercial:{title:'About the business',lead:'These are the figures insurers price on. Estimates are fine. All amounts in NZD.',q:[
    Q('trading','What does the business do?','area',{full:true,hint:'Main activities in a sentence or two.'}),
    Q('years','Years trading','int'),
    Q('staff','Employees (FTE)','int'),
    Q('turnover','Turnover, last 12 months (ex GST)','num'),
    Q('turnoverNext','Estimated turnover, next 12 months (ex GST)','num'),
    Q('wages','Annual wages and salaries','num'),
    Q('overseas','Turnover from overseas customers (%)','int',{hint:'Enter 0 if none.'}),
    Q('premises','Number of premises','int'),
    Q('claims','Any claims or incidents in the last 3 years?',YN,{full:true}),
    Q('claimsD','Claim details','area',{full:true,showIf:['claims','Yes'],hint:'Date, what happened, amount paid or reserved.'}),
    Q('declined','Ever declined, cancelled or put on special terms by an insurer?',YN,{full:true}),
    Q('declinedD','Details','area',{full:true,showIf:['declined','Yes']}),
    Q('changes','Changes since last renewal','area',{full:true,hint:'New premises, acquisitions, new activities, staff changes.'})
  ]},
  domestic:{title:'About the household',lead:'A few checks that apply across all policies.',q:[
    Q('address','Mailing address','text',{full:true,addr:true,hint:'Start typing the street address. For a PO Box or rural delivery, type it in.'}),
    Q('people','Any change to the people covered or living at the property?',YN,{full:true}),
    Q('peopleD','Who and when?','area',{full:true,showIf:['people','Yes']}),
    Q('claims','Any claims in the last 3 years?',YN,{full:true}),
    Q('claimsD','Claim details','area',{full:true,showIf:['claims','Yes'],hint:'Date, what happened, amount paid.'}),
    Q('declined','Ever declined, cancelled or put on special terms by an insurer?',YN,{full:true}),
    Q('declinedD','Details','area',{full:true,showIf:['declined','Yes']}),
    Q('changes','Anything else that has changed since last renewal','area',{full:true})
  ]}
};

var SEG={
  domestic:{label:'Domestic',tag:'Home, contents, vehicles and personal items',
    lines:['house','contents','vehicle','landlord','boat','valuables','caravan']},
  commercial:{label:'Commercial',tag:'Business property, liability, motor and management risks',
    lines:['mdamage','bi','liab','statutory','pi','dno','cyber','fleet','cargo','crime','machinery']}
};

var MOBILE_TRADES={building:1,plumbing:1,electrical:1,painting:1,roofing:1,landscaping:1,hvac:1,concrete:1,buildwash:1,finishtrades:1,arborist:1,solar:1,avtele:1,pest:1,cleaning:1};
function mobileBI(base){
  var gate=['gp','period','conc','gpChange'],out=[Q('relyWs','Does the business rely on a workshop, yard or depot to operate?',YN,{full:true,hint:'Mobile trades working from vans and client sites can usually keep earning after a fire at the yard. For them, Additional Increased Cost of Working (AICOW) cover is normally a better fit than gross profit cover: it pays the extra cost of keeping going, such as hiring temporary space, equipment or vehicles.'})];
  base.forEach(function(q){
    if(q.id==='icow')return;
    if(q.id==='icowAmt'){out.push(Object.assign({},q,{label:'Estimated extra costs of working (AICOW) over the indemnity period',showIf:null,hint:'What it would cost above normal running costs to keep trading: hire of space, tools and vehicles, overtime, expediting.'}));out.push(Q('aicowM','How long might you need it?','opt',{opts:['3 months','6 months','12 months','18 months']}));return;}
    out.push(gate.indexOf(q.id)>-1?Object.assign({},q,{showIf:['relyWs','Yes']}):q);
  });
  var k=-1;out.forEach(function(q,n){if(q.id==='icowAmt')k=n});if(k>1){var pr=out.splice(k,2);out.splice(1,0,pr[0],pr[1]);}
  return out;
}
function APPQ(){return [
  Q('appetite','How much risk are you comfortable carrying yourself?','opt',{full:true,opts:['Low: broad cover and a low excess, even if it costs more','Medium: a balance of cover and cost','High: a higher excess in return for a lower premium'],hint:'A higher excess usually lowers the premium. You choose how much you would be happy to pay out of your own pocket after a claim.'}),
  Q('excessNow','Current excess','num'),
  Q('excessOk','Highest excess you would be comfortable paying','num',{hint:'The most you would accept to bring the premium down.'})
];}
function ALARMQ(){return [
  Q('alarmType','Alarm','multi',{full:true,opts:['No alarm','Audible alarm (siren only)','Self-monitored (alerts the owner by phone or app)','Professionally monitored (security company responds)'],hint:'Tick all that apply.'}),
  Q('alarmCo','Monitoring company, if professionally monitored','text',{full:true}),
  Q('cctv','CCTV','opt',{full:true,opts:['No cameras','Cameras, live view only','Cameras, recorded on site','Cameras, recorded off site or in the cloud']})
];}
var LINES={
  house:{name:'House',desc:'Building rebuild value and construction',q:[
    Q('address','Property address','text',{full:true,addr:true}),
    Q('occupancy','Occupancy','opt',{full:true,opts:['Owner-occupied','Rented out','Holiday home','Vacant']}),
    Q('sum','Sum insured (rebuild cost)','num',{sum:true,hint:'Latest rebuild estimate, not market value or RV.'}),
    Q('built','Year built','int'),
    Q('area','Floor area (m²)','int'),
    Q('storeys','Storeys','opt',{opts:['1','2','3 or more']}),
    Q('walls','Wall cladding','opt',{full:true,opts:['Brick or masonry','Weatherboard','Plaster or monolithic','Concrete','Other']}),
    Q('roof','Roof','opt',{full:true,opts:['Tile','Metal','Membrane or other']}),
    Q('site','Flood, slip or liquefaction risk known at the site?','opt',{full:true,opts:['No','Yes','Not sure']}),
    Q('weather','Weathertightness or moisture issues known?',YN,{full:true}),
    Q('works','Building work since last renewal?',YN,{full:true}),
    Q('worksD','What was done, and cost?','area',{full:true,showIf:['works','Yes']}),
    Q('mortgagee','Mortgagee or lender, if any','text',{full:true})
  ]},
  contents:{name:'Home Contents',desc:'Contents value and security',q:ALARMQ().concat([
    Q('sum','Sum insured (contents)','num',{sum:true}),
    Q('hv','Any single item worth more than $3,000?',YN,{full:true,hint:'$3,000 is the lowest single-item limit we would normally see, so anything above it may need specifying. Think of jewellery and watches, cameras, bicycles and e-bikes, drones, canoes, kayaks and surfboards, collections, bullion and boats.'}),
    Q('hvD','List the items and values','area',{full:true,showIf:['hv','Yes']}),
    Q('smallLim','Do you hold any of these above the usual limits?','multi',{full:true,opts:['None','Coins, cards or stamps (over $1,000 each or $3,000 in total)','Gold, silver, bullion, precious metals or unset stones (over $1,000)','Remote-controlled scale models (over $2,000 in total)','Motor or marine parts and accessories (over $2,000)','Money, securities, certificates, documents or travel tickets (over $1,000)'],hint:'Tick all that apply. These are the lowest limits we would normally see. Many policies allow more or let you specify the item.'}),
    Q('smallLimD','Items and values for any ticked above','area',{full:true}),
    Q('security','Other security in place','multi',{full:true,opts:['Deadlocks','Smoke alarms','Window locks','Security lighting']}),
    Q('biz','Any business run from home?',YN,{full:true}),
    Q('empty','Home unoccupied for more than 60 days a year?',YN,{full:true})
  ])},
  vehicle:{name:'Motor Vehicle',desc:'Private car, drivers and use',q:[
    Q('veh','Make, model and year','text',{full:true}),
    Q('rego','Registration','text'),
    Q('value','Vehicle value (agreed or market)','num',{sum:true}),
    Q('fin','Finance company interest, if any','text',{full:true}),
    Q('use','Use','opt',{full:true,opts:['Private','Private and business','Business only']}),
    Q('garage','Overnight parking','opt',{full:true,opts:['Garage','Driveway or off-street','On the street']}),
    Q('main','Main driver (full name)','text'),
    Q('maindob','Main driver date of birth','date'),
    Q('licence','Main driver licence','opt',{full:true,opts:['Full NZ licence','Restricted','Learner','Overseas licence']}),
    Q('drivers','Any other regular drivers (names and ages)','area',{full:true}),
    Q('young','Any driver under 25?',YN),
    Q('mods','Modified in any way?',YN),
    Q('record','Any claims or accidents in the last 5 years?',YN,{full:true}),
    Q('recordD','Claims and accidents','claims',{full:true,showIf:['record','Yes']}),
    Q('conv','Any driving convictions in the last 5 years?',YN,{full:true}),
    Q('convD','What, when, and any demerit points','area',{full:true,showIf:['conv','Yes']})
  ]},
  landlord:{name:'Landlord',desc:'Rental property and tenancy',q:[
    Q('address','Rental address','text',{full:true,addr:true}),
    Q('sum','Sum insured (rebuild cost)','num',{sum:true}),
    Q('rent','Weekly rent','num'),
    Q('tenancy','Tenancy type','opt',{full:true,opts:['Long-term','Short-term or Airbnb','Student','Boarding house']}),
    Q('furnished','Furnished?',YN),
    Q('hh','Meets the Healthy Homes Standards?','opt',{opts:['Yes','No','Not sure']}),
    Q('tclaims','Tenant damage claims in the last 3 years?',YN),
    Q('meth','Methamphetamine test completed between tenants?',YN,{full:true}),
    Q('methD','Date of the most recent test','date',{showIf:['meth','Yes']}),
    Q('methR','Result','opt',{showIf:['meth','Yes'],opts:['Below the guideline','Above the guideline','Not sure']})
  ]},
  boat:{name:'Boat or Watercraft',desc:'Vessel details, mooring and use',q:[
    Q('kind','Type','opt',{full:true,opts:['Launch or power boat','Yacht','Jet ski','Dinghy or tender','Other']}),
    Q('length','Length (metres)','int'),
    Q('value','Value','num',{sum:true}),
    Q('engine','Engine make and horsepower','text',{full:true}),
    Q('mooring','Kept','opt',{full:true,opts:['Marina berth','Swing mooring','Trailer at home','Boat shed']}),
    Q('range','Where is it used?','opt',{full:true,opts:['Harbour or inshore','Coastal (to 12nm)','Offshore']}),
    Q('qual','Skipper holds a recognised qualification?',YN,{full:true})
  ]},
  valuables:{name:'Valuables and Jewellery',desc:'Items insured for more than standard limits',q:[
    Q('total','Total value','num',{sum:true}),
    Q('valn','Date of last valuation','date'),
    Q('items','Items over $2,500 (description and value)','area',{full:true}),
    Q('abroad','Worn or carried outside New Zealand?',YN,{full:true})
  ]},
  caravan:{name:'Caravan, Motorhome or Trailer',desc:'Towed and recreational vehicles',q:[
    Q('kind','Type','opt',{full:true,opts:['Caravan','Motorhome','Trailer','Horse float']}),
    Q('value','Value','num',{sum:true}),
    Q('rego','Registration','text'),
    Q('store','Stored','opt',{full:true,opts:['Garage or shed','Driveway','Storage yard']})
  ]},

  mdamage:{name:'Material Damage',desc:'Buildings, plant, stock and fit-out',q:[
    Q('premises','Premises addresses','area',{full:true}),
    Q('tenure','Occupancy','opt',{full:true,opts:['Owner','Tenant']}),
    Q('bldg','Buildings sum insured','num',{sum:true,hint:'Ex GST if GST registered.'}),
    Q('plant','Plant and equipment','num',{sum:true,f:'plant'}),
    Q('stock','Stock','num',{sum:true,f:'stock'}),
    Q('seasonal','Does stock rise at certain times of year (Christmas, harvest, winter)?',YN,{full:true,f:'stock'}),
    Q('seasonalPeak','Peak stock value','num',{showIf:['seasonal','Yes'],f:'stock',hint:'The highest value held at any one time.'}),
    Q('seasonalWhen','Which months, and for how long?','text',{full:true,showIf:['seasonal','Yes'],f:'stock'}),
    Q('fitout','Contents and fit-out','num',{sum:true}),
    Q('toolsOff','Tools and equipment kept off site (on job sites, in vehicles or with staff) that do not usually return to the premises','num',{sum:true,f:'plant',full:true,hint:'Portable tools and equipment valued at replacement cost. Leave blank if none.'}),
    Q('constr','Construction','opt',{full:true,opts:['Concrete or steel','Brick or masonry','Timber frame','Mixed']}),
    Q('epb','Building earthquake-prone or below 34% NBS?','opt',{opts:['No','Yes','Not sure']}),
    Q('spr','Sprinklers fitted?',YN),
    Q('haz','Hazardous or flammable goods stored?',YN,{f:'hazmat'}),
    Q('hazD','What and how much?','area',{full:true,showIf:['haz','Yes'],f:'hazmat'}),
    Q('valn','Date of last valuation','date'),
    Q('vacant','Any premises unoccupied for more than 60 days?',YN),
    Q('eps_use','Any EPS (expanded polystyrene) or other foam-core insulated panels in the walls, roof, ceilings or coolrooms?',YN,{full:true}),
    Q('eps_fr','Is the EPS fire retardant (FR) grade?','opt',{full:true,opts:['Yes, FR grade','No, standard grade','Not sure'],showIf:['eps_use','Yes']})
  ].concat(ALARMQ())},
  bi:{name:'Business Interruption',desc:'Gross profit and indemnity period',q:[
    Q('gp','Annual gross profit','num',{sum:true}),
    Q('period','Indemnity period','opt',{full:true,opts:['6 months','12 months','18 months','24 months','36 months']}),
    Q('icow','Additional increased costs of working: will you need to spend extra to keep trading after an accepted claim (temporary premises, equipment hire, overtime, expediting)?',YN,{full:true}),
    Q('icowAmt','Estimated total extra cost over the indemnity period','num',{showIf:['icow','Yes'],hint:'Roughly what it would cost above normal running costs.'}),
    Q('conc','Any customer or supplier above 25% of the business?',YN,{full:true}),
    Q('concD','Who, and what share?','area',{full:true,showIf:['conc','Yes']}),
    Q('gpChange','Gross profit expected to move by more than 10%?',YN,{full:true})
  ]},
  liab:{name:'Public and Products Liability',desc:'Limit, exports, contractors and products',q:[
    Q('limit','Limit of liability','opt',{full:true,opts:['$1M','$2M','$5M','$10M','Other']}),
    Q('subs','Use subcontractors?',YN,{f:'subs'}),
    Q('subSpend','Annual subcontractor spend','num',{showIf:['subs','Yes'],f:'subs'}),
    Q('na','Any exports or overseas sales, including to the USA or Canada?',YN,{f:'export',hint:'Includes products, services and online sales to overseas customers.'}),
    Q('naWhere','Countries and regions','multi',{full:true,showIf:['na','Yes'],f:'export',opts:['USA','Canada','Australia','United Kingdom','Europe','China','Rest of Asia','Pacific Islands','Middle East','Africa','South America','Other']}),
    Q('naOther','Other countries','text',{full:true,showIf:['na','Yes'],f:'export'}),
    Q('naUS','Share of revenue from the USA and Canada (%)','int',{showIf:['na','Yes'],f:'export',hint:'The main driver of liability pricing and jurisdiction terms.'}),
    Q('naAll','Share of revenue from all exports (%)','int',{showIf:['na','Yes'],f:'export'}),
    Q('naHow','How do goods or services reach overseas customers?','multi',{full:true,showIf:['na','Yes'],f:'export',opts:['Shipped direct to customers','Through a distributor or agent','Online sales','Installed or serviced overseas by staff','Licensed or manufactured overseas']}),
    Q('naContr','Overseas contracts say which country\u2019s law and courts apply?','opt',{full:true,showIf:['na','Yes'],f:'export',opts:['NZ law and courts','Overseas law or courts','Mixed','No contracts']}),
    Q('prod','Manufacture, import or supply products?',YN,{f:'products'}),
    Q('site','Work carried out at clients’ premises?',YN,{f:'onsite'}),
    Q('height','Work at height or with heavy equipment?',YN,{showIf:['site','Yes'],f:'height'}),
    Q('contracts','Contracts require indemnities or specific liability limits?',YN,{full:true}),
    Q('subsIns','Do subcontractors carry their own liability insurance, and do you check it?',YN,{full:true,showIf:['subs','Yes'],f:'subs'}),
    Q('prodD','What products, and where are they sold or used?','area',{full:true,showIf:['prod','Yes'],f:'products'}),
    Q('recall','Batch tracing or a product recall procedure in place?',YN,{full:true,showIf:['prod','Yes'],f:'products'}),
    Q('visitors','Do members of the public visit your premises?',YN),
    Q('ccc','Do you hold or work on property belonging to others (customer goods, vehicles, equipment)?',YN,{full:true}),
    Q('cccD','What, and the highest value at any one time?','area',{full:true,showIf:['ccc','Yes']}),
    Q('terms','Written terms and conditions that limit your liability?',YN,{full:true}),
    Q('lclaims','Any general or public liability claims in the last 5 years?',YN,{full:true,hint:'Includes incidents where other people\u2019s property was damaged.'}),
    Q('lclaimsD','Details','area',{full:true,showIf:['lclaims','Yes'],hint:'Date, what happened, amount paid or reserved.'}),
    Q('liabNote','Anything else the insurer should know','area',{full:true})
  ]},
  statutory:{name:'Statutory Liability',desc:'Regulatory exposure and health and safety',q:[
    Q('staff','Employees and contractors on site','int'),
    Q('inv','Investigation or prosecution by WorkSafe, council or another regulator in the last 5 years?',YN,{full:true}),
    Q('invD','Details','area',{full:true,showIf:['inv','Yes']}),
    Q('hs','Documented health and safety system (Health and Safety at Work Act 2015)?',YN,{full:true}),
    Q('audit','Last external health and safety audit','date')
  ]},
  pi:{name:'Professional Indemnity',desc:'Fee income, limits and contract terms',q:[
    Q('fees','Annual fee income (ex GST)','num'),
    Q('limit','Limit of indemnity','opt',{full:true,opts:['$500k','$1M','$2M','$5M','Other']}),
    Q('largest','Largest single project or contract value','num'),
    Q('lol','Contracts include a limitation of liability?',YN,{full:true}),
    Q('overseas','Any work for overseas clients?',YN,{full:true}),
    Q('quals','Professional qualifications, registrations or memberships','text',{full:true}),
    Q('workD','Main types of work or advice given','area',{full:true}),
    Q('fe','Fee earners (people doing chargeable professional work)','int'),
    Q('topc','Largest client as a share of fee income (%)','int'),
    Q('hirisk','Any higher-risk work (structural or geotechnical design, producer statements, financial or investment advice, work for USA or Canadian clients)?',YN,{full:true}),
    Q('hiriskD','Details','area',{full:true,showIf:['hirisk','Yes']}),
    Q('eng','Written engagement terms signed before work starts?',YN,{full:true}),
    Q('qa','Peer review or quality checks before work is issued?',YN,{full:true}),
    Q('outs','Do you subcontract or outsource professional work?',YN,{full:true}),
    Q('outsPI','Do those providers hold their own professional indemnity cover?',YN,{full:true,showIf:['outs','Yes']}),
    Q('retro','Retroactive date on the current policy, if known','date'),
    Q('circ','Any claims or circumstances that could lead to a claim?',YN,{full:true}),
    Q('circD','Details','area',{full:true,showIf:['circ','Yes']})
  ]},
  dno:{name:'Directors and Officers',desc:'Management liability and governance',q:[
    Q('dirs','Number of directors','int'),
    Q('assets','Net assets (latest accounts)','num'),
    Q('dispute','Any shareholder or director disputes?',YN,{full:true}),
    Q('epl','Any personal grievance or employment claims in the last 3 years?',YN,{full:true}),
    Q('insolv','Any financial difficulty or going-concern concern?',YN,{full:true}),
    Q('dnoD','Details','area',{full:true})
  ]},
  cyber:{name:'Cyber',desc:'Data held, controls and incident history',q:[
    Q('limit','Limit required','opt',{full:true,opts:['$250k','$500k','$1M','$2M','Other']}),
    Q('records','Customer or personal records held','int'),
    Q('cards','Process card payments?',YN),
    Q('mfa','Multi-factor authentication','opt',{full:true,opts:['All users','Admins only','None']}),
    Q('backup','Backups','opt',{full:true,opts:['Daily offline or immutable','Daily online','Less often']}),
    Q('itBy','Who looks after your IT?','opt',{full:true,opts:['In-house staff','External IT provider','Owner or staff part-time','Nobody in particular']}),
    Q('sens','Sensitive information held','multi',{full:true,opts:['Health records','ID or passport scans','Bank or card details','Client financial or legal files','Staff records only','None of these']}),
    Q('mfaRem','Multi-factor authentication on email and remote access?',YN),
    Q('edr','Antivirus or endpoint protection on every computer and server?',YN),
    Q('patch','Critical security updates applied within 30 days?',YN),
    Q('eol','Any software or devices no longer supported by the maker?',YN),
    Q('bkTest','Backups kept separate from the main network and a restore tested in the last 12 months?',YN,{full:true}),
    Q('train','Staff phishing and cyber awareness training?',YN),
    Q('payVer','Payment or bank detail changes verified by calling a known number?',YN,{full:true}),
    Q('irp','Written incident response plan, or a known contact to call?',YN),
    Q('down','How long could you trade without your systems?','opt',{opts:['Under 4 hours','Up to 1 day','Up to 1 week','Longer than a week']}),
    Q('ecom','Share of sales taken online (%)','int'),
    Q('incident','Cyber incident or ransomware event in the last 3 years?',YN,{full:true}),
    Q('incidentD','Details','area',{full:true,showIf:['incident','Yes']})
  ]},
  fleet:{name:'Commercial Motor Fleet',desc:'Vehicles, drivers and operating radius',q:[
    Q('veh','Vehicle schedule','vlist',{full:true,hint:'One row per vehicle. Add as many as you need.'}),
    Q('value','Total fleet value','num',{sum:true,hint:'Adds up from the vehicle schedule above (values plus accessories). You can change it.'}),
    Q('hvy','Any heavy vehicles (over 3,500kg GVM)?',YN),
    Q('hvyN','How many heavy vehicles?','int',{showIf:['hvy','Yes']}),
    Q('longhaul','Long haul work (regular trips over 300km, or between the islands)?',YN,{showIf:['hvy','Yes']}),
    Q('licCl','Licence class required for the vehicles used','multi',{full:true,showIf:['hvy','Yes'],opts:['Class 2 (medium rigid)','Class 3 (medium combination)','Class 4 (heavy rigid)','Class 5 (heavy combination)','D endorsement (dangerous goods)']}),
    Q('radius','Operating area','opt',{full:true,opts:['Local','Regional','Nationwide']}),
    Q('young','Any driver under 25?',YN),
    Q('yn1','Under 25 driver 1: full name','text',{showIf:['young','Yes']}),
    Q('yd1','Under 25 driver 1: date of birth','date',{showIf:['young','Yes']}),
    Q('yn2','Under 25 driver 2: full name','text',{showIf:['young','Yes']}),
    Q('yd2','Under 25 driver 2: date of birth','date',{showIf:['young','Yes']}),
    Q('yn3','Under 25 driver 3: full name','text',{showIf:['young','Yes']}),
    Q('yd3','Under 25 driver 3: date of birth','date',{showIf:['young','Yes']}),
    Q('ymore','Any driver under 25 (names and dates of birth)','area',{full:true,showIf:['young','Yes']}),
    Q('tele','Telematics fitted?',YN),
    Q('teleType','Which systems are fitted?','multi',{full:true,showIf:['tele','Yes'],opts:['Fleet GPS tracking and logging','Driver fatigue and distraction monitoring (eye tracking)','In-cab dash cameras','Driver behaviour scoring (speed, braking)','Electronic logbook and RUC records','Immobiliser or theft recovery tracker']}),
    Q('teleProv','Provider','opt',{showIf:['tele','Yes'],opts:['Teletrac Navman','Smartrak','MiX Telematics','Cartrack','Other']}),
    Q('claims','At-fault claims in the last 3 years?',YN,{full:true}),
    Q('claimsD','Number and cost','area',{full:true,showIf:['claims','Yes']})
  ]},
  cargo:{name:'Transit and Marine Cargo',desc:'Goods in transit, imports and exports',q:[
    Q('annual','Annual value of goods sent or received','num'),
    Q('largest','Largest single consignment','num'),
    Q('modes','Modes of transport','multi',{full:true,opts:['Road','Sea','Air','Rail']}),
    Q('flow','Trade','opt',{full:true,opts:['Inland only','Imports','Exports','Imports and exports']}),
    Q('inco','Incoterms used on shipments','multi',{full:true,showIf:['flow','!Inland only'],hint:'Hover over a term for what it means.',tips:{'EXW Ex Works':'Buyer collects from the seller, and carries nearly all the risk.','FCA Free Carrier':'Seller hands the goods to the buyer\u2019s carrier, and risk passes there.','FOB Free On Board':'Sea only. Risk passes to the buyer when the goods are loaded on the ship.','CFR Cost and Freight':'Sea only. Seller pays the freight, but risk still passes to the buyer at loading.','CIF Cost, Insurance and Freight':'Sea only. As CFR, with the seller arranging minimum insurance cover.','CPT Carriage Paid To':'Seller pays the carriage, and risk passes to the buyer at the first carrier.','CIP Carriage and Insurance Paid To':'As CPT, with the seller arranging broader insurance cover.','DAP Delivered at Place':'Seller carries the risk to the destination, before unloading.','DPU Delivered at Place Unloaded':'Seller carries the risk until the goods are unloaded.','DDP Delivered Duty Paid':'Seller carries all risk and costs, including duties and taxes.'},opts:['EXW Ex Works','FCA Free Carrier','FOB Free On Board','CFR Cost and Freight','CIF Cost, Insurance and Freight','CPT Carriage Paid To','CIP Carriage and Insurance Paid To','DAP Delivered at Place','DPU Delivered at Place Unloaded','DDP Delivered Duty Paid','Not sure']}),
    Q('impFrom','Countries you import from','multi',{full:true,showIf:['flow','Imports|Imports and exports'],opts:['China','Australia','USA','Canada','Japan','South Korea','Singapore','Thailand','Vietnam','India','United Kingdom','Europe','Pacific Islands','Middle East','Other']}),
    Q('expTo','Countries you export to','multi',{full:true,showIf:['flow','Exports|Imports and exports'],opts:['China','Australia','USA','Canada','Japan','South Korea','Singapore','Thailand','Vietnam','India','United Kingdom','Europe','Pacific Islands','Middle East','Other']}),
    Q('ctyOther','Other countries, if not listed','text',{full:true,showIf:['flow','!Inland only']}),
    Q('cargoNote','Main goods carried','area',{full:true})
  ]},
  crime:{name:'Crime and Fidelity',desc:'Cash, fraud and payment controls',q:[
    Q('cash','Maximum cash on premises','num'),
    Q('handlers','Employees handling funds','int'),
    Q('dual','Dual authorisation for payments?',YN),
    Q('audit','Annual external audit or review?',YN),
    Q('loss','Any fraud or theft loss in the last 5 years?',YN,{full:true}),
    Q('lossD','Details','area',{full:true,showIf:['loss','Yes']})
  ]},
  machinery:{name:'Machinery Breakdown and Computers',desc:'Key plant, servicing and downtime',q:[
    Q('plant','Value of machinery and electronics','num',{sum:true}),
    Q('items','Number of key machines','int'),
    Q('maint','Maintenance contracts in place?',YN),
    Q('single','Is there a single machine whose loss would stop trading for more than 2 weeks?',YN,{full:true}),
    Q('singleD','Which machine, and how long to replace?','area',{full:true,showIf:['single','Yes']})
  ]}
};
Object.keys(LINES).forEach(function(l){LINES[l].q=LINES[l].q.concat(APPQ());});

/* ---------- industry database (loaded from data/*.json) ---------- */
var IND={
  other:{name:'Other business',desc:'Anything not listed. Shows the general business prompts.',group:'Other',lines:['mdamage','bi','liab','statutory'],xlines:[],feat:[],profile:[],lineQ:{},ask:{},docs:[],aliases:[]},
  domestic:{name:'Domestic',desc:'',group:'',lines:[],xlines:[],feat:[],profile:[],lineQ:{},ask:{},docs:[],aliases:[]}
};
var ALLX=[],DBOK=false;
var DBFILES=['packs.json','ind-00.json','ind-01.json','ind-02.json','ind-03.json','ind-04.json','ind-05.json','ind-06.json','ind-07.json','ind-08.json','ind-09.json','ind-10.json'];
function cq(a){return Q(a[0],a[1],a[2],a[3]?JSON.parse(JSON.stringify(a[3])):{});}
function mergeInd(def,packs){
  var out={name:def.name,desc:def.desc||'',group:def.group||'Other',lines:(def.lines||[]).slice(),xlines:[],feat:[],profile:[],lineQ:{},ask:{},docs:[],aliases:def.aliases||[]};
  function addPart(p){
    (p.feat||[]).forEach(function(f){if(out.feat.indexOf(f)<0)out.feat.push(f);});
    (p.profile||[]).forEach(function(a){out.profile.push(cq(a));});
    Object.keys(p.lineQ||{}).forEach(function(l){out.lineQ[l]=out.lineQ[l]||[];p.lineQ[l].forEach(function(a){out.lineQ[l].push(cq(a));});});
    Object.keys(p.ask||{}).forEach(function(g){out.ask[g]=(out.ask[g]||[]).concat(p.ask[g]);});
    (p.docs||[]).forEach(function(d){if(out.docs.indexOf(d)<0)out.docs.push(d);});
    Object.keys(p.xl||{}).forEach(function(id){
      if(!LINES[id]){var x=p.xl[id];LINES[id]={name:x.name,desc:x.desc,x:true,q:x.q.map(cq).concat(APPQ())};}
      if(out.xlines.indexOf(id)<0)out.xlines.push(id);
      if(ALLX.indexOf(id)<0)ALLX.push(id);
    });
  }
  addPart(def);
  (def.packs||[]).forEach(function(k){if(packs[k])addPart(packs[k]);});
  return out;
}

var PACKS={};
var DBFILES=['packs.json','ind-00.json','ind-01.json','ind-02.json','ind-03.json','ind-04.json','ind-05.json','ind-06.json','ind-07.json','ind-08.json'];
function nrm(s){return String(s==null?'':s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');}
function loadDB(){
  return Promise.all(DBFILES.map(function(f){return fetch(f).then(function(r){if(!r.ok)throw new Error(f);return r.json();}).catch(function(){return null;});})).then(function(arr){
    var packs=arr[0]||{},defs={},n=0;
    arr.slice(1).forEach(function(o){if(o)Object.keys(o).forEach(function(k){defs[k]=o[k];});});
    Object.keys(defs).forEach(function(k){IND[k]=mergeInd(defs[k],packs);n++;});
    PACKS=packs;return n;
  }).catch(function(){return 0;});
}
function indFromName(raw){
  var n=nrm(raw);if(!n)return '';
  var best='',bl=0;
  Object.keys(IND).forEach(function(k){
    if(k==='other'||k==='domestic')return;
    var d=IND[k];
    if(nrm(d.name)===n){best=k;bl=99;return;}
    (d.aliases||[]).forEach(function(a){var an=nrm(a);if(an.length>=3&&n.indexOf(an)>-1&&an.length>bl){best=k;bl=an.length;}});
  });
  return best;
}
