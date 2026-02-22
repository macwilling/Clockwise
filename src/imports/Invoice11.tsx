function Frame8() {
  return (
    <div className="absolute content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[2px] items-end leading-[14px] not-italic right-[32px] text-[#5e6470] text-[10px] text-right top-[50px]">
      <div className="relative shrink-0 whitespace-nowrap">
        <p className="mb-0">Business address</p>
        <p>City, State, IN - 000 000</p>
      </div>
      <p className="relative shrink-0">TAX ID 00XXXXX1234X0XX</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-end not-italic right-[16px] text-right top-[20px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14px] relative shrink-0 text-[#5e6470] text-[10px]">Invoice of (USD)</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[28px] relative shrink-0 text-[#e87117] text-[20px]">$4,950.00</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start leading-[14px] left-[244px] not-italic text-[10px] top-[20px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">Invoice number</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21]">#AB2324-01</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start leading-[14px] left-[244px] not-italic text-[10px] top-[76px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">Reference</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21] w-[41px] whitespace-pre-wrap">INV-057</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start leading-[14px] left-[244px] not-italic text-[10px] top-[132px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">Invoice date</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21]">01 Aug, 2023</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start leading-[14px] left-[16px] not-italic text-[10px] top-[132px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">{`Subject `}</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21]">Design System</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-end leading-[14px] not-italic right-[16px] text-[10px] text-right top-[132px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">Due date</p>
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21]">15 Aug, 2023</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#1a1c21]">Client Name</p>
      <div className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#5e6470] whitespace-nowrap">
        <p className="mb-0">Business address</p>
        <p>City, Country - 00000</p>
      </div>
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#5e6470]">+0 (000) 123-4567</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start leading-[14px] left-[16px] not-italic text-[10px] top-[20px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#5e6470]">Billed to,</p>
      <Frame5 />
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute bg-white h-[644px] left-[16px] rounded-[12px] top-[118px] w-[563px]">
      <div aria-hidden="true" className="absolute border-[#d7dae0] border-[0.5px] border-solid inset-[-0.5px] pointer-events-none rounded-[12.5px]" />
      <Frame6 />
      <Frame3 />
      <Frame2 />
      <Frame1 />
      <Frame7 />
      <Frame4 />
      <Frame9 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[16px] not-italic text-[#5e6470] text-[8px] top-[196px] tracking-[0.32px] uppercase">Item Detail</p>
      <div className="absolute h-0 left-[16px] top-[188px] w-[531px]">
        <div className="absolute inset-[-0.25px_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 531 0.5">
            <path d="M0 0.25H531" id="Vector 144" stroke="var(--stroke-0, #D7DAE0)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute h-0 left-[16px] top-[216px] w-[531px]">
        <div className="absolute inset-[-0.25px_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 531 0.5">
            <path d="M0 0.25H531" id="Vector 144" stroke="var(--stroke-0, #D7DAE0)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute h-0 left-[16px] top-[312px] w-[531px]">
        <div className="absolute inset-[-0.25px_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 531 0.5">
            <path d="M0 0.25H531" id="Vector 144" stroke="var(--stroke-0, #D7DAE0)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute h-0 left-[307px] top-[376px] w-[240px]">
        <div className="absolute inset-[-0.25px_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 240 0.5">
            <path d="M0 0.25H240" id="Vector 147" stroke="var(--stroke-0, #D7DAE0)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[307px] not-italic text-[#5e6470] text-[8px] top-[196px] tracking-[0.32px] uppercase">Qty</p>
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[427px] not-italic text-[#5e6470] text-[8px] text-right top-[196px] tracking-[0.32px] uppercase w-[80px] whitespace-pre-wrap">Rate</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic right-[16px] text-[#5e6470] text-[8px] text-right top-[196px] tracking-[0.32px] uppercase w-[100px] whitespace-pre-wrap">Amount</p>
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14px] left-[16px] not-italic text-[#1a1c21] text-[10px] top-[228px]">Item Name</p>
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14px] left-[16px] not-italic text-[#1a1c21] text-[10px] top-[270px]">Item Name</p>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[14px] left-[16px] not-italic text-[#5e6470] text-[10px] top-[244px]">Item description</p>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[14px] left-[16px] not-italic text-[#5e6470] text-[10px] top-[286px]">Item description</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[307px] not-italic text-[#1a1c21] text-[10px] top-[228px]">1</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[307px] not-italic text-[#1a1c21] text-[10px] top-[272px]">1</p>
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[427px] not-italic text-[#1a1c21] text-[10px] text-right top-[228px]">$3,000.00</p>
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[427px] not-italic text-[#1a1c21] text-[10px] text-right top-[272px]">$1,500.00</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic right-[16px] text-[#1a1c21] text-[10px] text-right top-[228px]">$3,000.00</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic right-[16px] text-[#1a1c21] text-[10px] text-right top-[272px]">$1,500.00</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic right-[16px] text-[#1a1c21] text-[10px] text-right top-[324px]">$4,500.00</p>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[14px] not-italic right-[16px] text-[#1a1c21] text-[10px] text-right top-[388px]">$4,950.00</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] not-italic right-[16px] text-[#1a1c21] text-[10px] text-right top-[350px]">$450.00</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[307px] not-italic text-[#1a1c21] text-[10px] top-[324px]">Subtotal</p>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[14px] left-[307px] not-italic text-[#1a1c21] text-[10px] top-[388px]">Total</p>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[307px] not-italic text-[#1a1c21] text-[10px] top-[350px]">Tax (10%)</p>
      <p className="absolute bottom-[34px] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14px] left-[16px] not-italic text-[#1a1c21] text-[10px] translate-y-full">Thanks for the business.</p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[32px] not-italic top-[24px]">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#1a1c21] text-[18px] w-[151px] whitespace-pre-wrap">Alvish Baldha</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[14px] relative shrink-0 text-[#5e6470] text-[10px]">www.website.com</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[14px] relative shrink-0 text-[#5e6470] text-[10px]">hello@email.com</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[14px] relative shrink-0 text-[#5e6470] text-[10px]">+91 00000 00000</p>
    </div>
  );
}

export default function Invoice() {
  return (
    <div className="bg-[#f9fafc] relative size-full" data-name="Invoice 1.1">
      <Frame8 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14px] left-[32px] not-italic text-[#5e6470] text-[10px] top-[786px]">{`Terms & Conditions`}</p>
      <Frame />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[14px] left-[32px] not-italic text-[#1a1c21] text-[10px] top-[804px]">Please pay within 15 days of receiving this invoice.</p>
      <Frame10 />
    </div>
  );
}