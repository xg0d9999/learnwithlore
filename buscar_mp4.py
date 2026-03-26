import os
import sys

def check_media_files(directory):
    if not os.path.exists(directory):
        print(f"Error: La ruta '{directory}' no existe.")
        return

    # Extensiones de video y foto famosas
    extensions = {
        '.mp4', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.webm', # Video
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff' # Foto
    }

    print(f"Buscando archivos de video y foto en: {directory}\n")
    found = False
    for root, dirs, files in os.walk(directory):
        for file in files:
            name, ext = os.path.splitext(file)
            if ext.lower() in extensions:
                print(f"[{ext.upper()[1:]}] {os.path.join(root, file)}")
                found = True
    
    if not found:
        print("No se encontraron archivos de video o foto.")

if __name__ == "__main__":
    # Obtener el directorio padre de donde está contenido este script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    
    # Si se pasa un argumento, usarlo. Si no, usar el directorio padre.
    path = sys.argv[1] if len(sys.argv) > 1 else parent_dir
    check_media_files(path)
