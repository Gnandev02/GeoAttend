import Navbar from './Navbar';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
            <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Geo-Integrated Attendance System
            </footer>
        </div>
    );
};

export default Layout;
