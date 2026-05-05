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
  "Oman",
  "Pakistan",
  "Qatar",
  "Saudi Arabia",
  "Singapore (restricted distribution)",
  "Somalia",
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
        DTT
        prohibit access from the jurisdictions listed below. Customers
        and Creators residing in or accessing the platform from these regions are
        blocked from registration, content access, payments, and payouts. Lists are
        reviewed continuously against OFAC, UN, EU, UK HMT, and applicable national
        sanctions and adult-content regulations.
      </p>

      <div>
        <p className="text-foreground font-bold mb-2">
          1. OFAC / UN / EU Sanctioned Jurisdictions
        </p>
        <p className="mb-2 text-[11px]">
          Comprehensive embargoes — no payments, payouts, or accounts permitted.
        </p>
        <CountryColumn items={OFAC_SANCTIONED} />
      </div>

      <div>
        <p className="text-foreground font-bold mb-2">
          2. Adult-Content Prohibited Jurisdictions
        </p>
        <p className="mb-2 text-[11px]">
          Local law prohibits or heavily restricts adult content. Access is blocked
          to protect users and comply with extraterritorial enforcement risk.
        </p>
        <CountryColumn items={ADULT_CONTENT_PROHIBITED} />
      </div>

      <div>
        <p className="text-foreground font-bold mb-2">
          3. DTT "Ghost List" — Internal Risk Block
        </p>
        <p className="mb-2 text-[11px]">
          U.S. territories and regions where licensing, tax, or banking partners
          impose additional restrictions. Some allow viewing but block creator
          payouts pending case-by-case review.
        </p>
        <CountryColumn items={GHOST_LIST} />
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
        <p className="text-foreground font-bold text-[11px]">Enforcement Mechanism</p>
        <p className="text-[11px]">
          • IP geolocation check at app load and at every checkout.<br />
          • Crypto wallet screening via OFAC/sanctions lists.<br />
          • Creator payouts blocked at the wallet layer for restricted residency.<br />
          • VPN circumvention is a Terms violation and triggers account termination
          and fund forfeiture.
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        This list is non-exhaustive and updated as sanctions and local law change.
        Questions or appeals: <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a>.
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}.
      </p>
    </div>
  </>
);

export default RestrictedCountries;
