import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User, MapPin } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <MapPin className="h-8 w-8 text-indigo-600 mr-2" />
                        <span className="font-bold text-xl text-gray-800">GeoAttend</span>
                    </div>

                    {user && (
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center text-gray-700">
                                <User className="h-5 w-5 mr-1" />
                                <span className="font-medium">{user.name}</span>
                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 py-1 px-2 rounded-full uppercase tracking-wide font-semibold">
                                    {user.role}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 py-2 px-3 rounded-md"
                            >
                                <LogOut className="h-4 w-4 mr-1" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
