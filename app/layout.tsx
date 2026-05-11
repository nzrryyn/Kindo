import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning tetap ditambahkan di sini */}
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}