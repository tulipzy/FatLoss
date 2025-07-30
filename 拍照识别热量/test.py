import requests

url = 'http://127.0.0.1:8000/predict/'

with open("img1.png", "rb") as f:
    files = {'file': ('dish.jpg', f, 'image/jpeg')}
    data = {
        'hand_length_cm': '18',
        'hand_area_cm2': '110'
    }

    response = requests.post(url, files=files, data=data)
    print(response.status_code)
    print(response.json())
