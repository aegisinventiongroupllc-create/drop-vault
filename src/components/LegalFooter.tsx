import { useState } from "react";

const LegalFooter = () => {
  const [show2257, setShow2257] = useState(false);

  return (
    <>
      <div className="py-4 text-center border-t border-border mt-auto">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          © 2026 DTT Media LLC. All Rights Reserved. Must be 18+ to enter.
        </p>
        <button
          onClick={() => setShow2257(true)}
          className="text-[9px] text-muted-foreground/40 hover:text-primary transition-colors underline"
        >
          18 U.S.C. § 2257 Record-Keeping Requirements Compliance Statement
        </button>
      </div>

      {show2257 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={() => setShow2257(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              18 U.S.C. § 2257 Compliance Statement
            </h3>
            <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                DTT Media LLC is a technology platform that facilitates digital content distribution between independent creators and consumers.
              </p>
              <p>
                <strong className="text-foreground">Creators as Primary Producers:</strong> All creators on this platform are classified as independent contractors and serve as the primary "Producers" of their own content as defined under 18 U.S.C. § 2257. Each creator is solely responsible for maintaining all records required under federal law, including but not limited to records confirming that all individuals depicted in their content are at least 18 years of age.
              </p>
              <p>
                <strong className="text-foreground">Record Custodian:</strong> Each creator maintains their own 2257 records at a location of their choosing. DTT Media LLC does not produce content and does not serve as the custodian of records for any content uploaded by creators.
              </p>
              <p>
                <strong className="text-foreground">Platform Responsibility:</strong> DTT Media LLC requires all creators to verify their identity and age through our identity verification process before being granted permission to upload or distribute content. Failure to comply with 2257 requirements will result in immediate account termination.
              </p>
              <p className="text-muted-foreground/60 text-[10px]">
                For questions regarding compliance, contact: dropthatthingmedia@gmail.com
              </p>
            </div>
            <button
              onClick={() => setShow2257(false)}
              className="mt-4 w-full py-2 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalFooter;
