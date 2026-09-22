import Image from "next/image";

/**
 * شريط الشعارات الرسمي: رؤية عُمان 2040، ووزارة التعليم، ومدرسة صحار للبنين،
 * واليونسكو، والمدارس المنتسبة لليونسكو.
 *
 * يعلو الترويسة ولا يلتصق بأعلى الشاشة، فلا يقتطع من مساحة القراءة عند التمرير.
 *
 * الملف مهيَّأ سلفاً بمقاس العرض ونسق webp، ويُقدَّم بـ unoptimized كي لا يمرّ
 * بمحسّن الصور: المحسّن يأخذ ثوانٍ في أوّل طلب على خطة Render المجانية.
 */
export function PartnersStrip() {
  return (
    <div className="border-b border-[var(--color-line)] bg-white">
      <div className="container-x flex justify-center py-2.5 sm:py-3">
        <Image
          src="/partners.webp"
          alt="رؤية عُمان 2040 · سلطنة عمان وزارة التعليم · مدرسة صحار للبنين (11-12) · اليونسكو · المدارس المنتسبة لليونسكو"
          width={760}
          height={175}
          priority
          unoptimized
          className="h-auto w-full max-w-sm sm:max-w-md"
        />
      </div>
    </div>
  );
}
