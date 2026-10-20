// Public Restricted Countries / Geo-Block List
// Used by LegalFooter modal. Visible to both customers and creators.
// Compliance reviewers reference this list to confirm our geo-block scope.

const OFAC_SANCTIONED = [
  "Cuba",
  "Iran",
  "North Korea (DPRK)",
  "Syria",
  "Crimea Region (Ukraine)",
  "Donetsk People's Republic (Ukraine)",
  "Luhansk People's Republic (Ukraine)",
  "Russia (sanctioned individuals & entities)",
  "Belarus (sanctioned individuals & entities)",
  "Venezuela (sanctioned government & entities)",
  "Myanmar (Burma) (sanctioned entities)",
];

const ADULT_CONTENT_PROHIBITED = [
  "Afghanistan",
  "Bangladesh",
  "Bhutan",
  "Brunei",
  "China (mainland)",
  "Egypt",
  "India",
  "Indonesia",
  "Iraq",
  "Jordan",
  "Kuwait",
  "Lebanon",
  "Libya",
  "Malaysia",
  "Maldives",
  "Morocco",
  "Nepal",
  "Nigeria",
  "Oman",
  "Pakistan",
  "Philippines",
  "Qatar",
  "Saudi Arabia",
  "Singapore (restricted distribution)",
  "Somalia",
  "South Korea",
  "Sri Lanka",
  "Sudan",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "United Arab Emirates",
  "Uzbekistan",
  "Vietnam",
  "Yemen",
];

const GHOST_LIST = [
  "American Samoa",
  "Guam",
  "Northern Mariana Islands",
  "Puerto Rico (creator payouts only — review)",
  "U.S. Virgin Islands",
];

const COMPLIANCE_REVIEW = ["Japan", "South Africa"];

const CountryColumn = ({ items }: { items: string[] }) => (
  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
    {items.map((c) => (
      <li key={c} className="flex items-start gap-1.5">
        <span className="text-destructive mt-0.5">•</span>
        <span>{c}</span>
      </li>
    ))}
  </ul>
);

const RestrictedCountries = () => (
  <>
    <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
      Restricted Countries / Geo-Block List
    </h3>
    <div className="text-xs text-muted-foreground space-y-4 leading-relaxed">
      <p>
        DTT restricts the markets below under its current business policy. Legal and payment requirements vary by jurisdiction and require qualified review. This list is not a guarantee of comprehensive sanctions screening or country enforcement.
      </p>

      <div>
        <p className="text-foreground font-bold mb-2">
          1. Sanctions-Related Restrictions — Review Required
        </p>
        <p className="mb-2 text-[11px]">
          Restrictions may apply to a territory, an individual or an entity; not every listed country is subject to a comprehensive embargo. DTT does not authorize sanctions evasion.
        </p>
        <CountryColumn items={OFAC_SANCTIONED} />
      </div>

      <div>
        <p className="text-foreground font-bold mb-2">
          2. Adult-Content Risk Restrictions
        </p>
        <p className="mb-2 text-[11px]">
          DTT excludes these markets pending jurisdiction-specific advice. Inclusion is a business restriction, not a blanket statement that all adult content is illegal there.
        </p>
        <CountryColumn items={ADULT_CONTENT_PROHIBITED} />
      </div>

      <div>
        <p className="text-foreground font-bold mb-2">
          3. DTT "Ghost List" — Internal Risk Block
        </p>
        <p className="mb-2 text-[11px]">
          DTT treats these territories as internal risk-review entries. Viewing and payout eligibility require separate review; inclusion does not establish a legal prohibition.
        </p>
        <CountryColumn items={GHOST_LIST} />
      </div>

      <div>
        <p className="text-foreground font-bold mb-2">4. Temporarily Paused — Compliance Review</p>
        <p className="mb-2 text-[11px]">DTT has paused these markets while reviewing Japan’s obscenity and content-distribution requirements and South Africa’s FPB registration and classification requirements. This is a precautionary business restriction, not a claim that all adult content or every African country is prohibited. The same restrictions apply to men and women.</p>
        <CountryColumn items={COMPLIANCE_REVIEW} />
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
        <p className="text-foreground font-bold text-[11px]">Current Checks and Limitations</p>
        <p className="text-[11px]">
          The app checks an IP-based country estimate at entry. This browser check can fail or be bypassed and does not prove comprehensive checkout, wallet or payout screening. Stronger server-side enforcement and compliance review are required before launch. Do not use a VPN or other means to evade DTT restrictions.
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        This list is non-exhaustive and subject to review as sanctions and local law change.
        Questions or appeals: <a href="mailto:admin@dttmediallc.com" className="text-primary hover:underline">admin@dttmediallc.com</a>.
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}.
      </p>
    </div>
  </>
);

export default RestrictedCountries;
